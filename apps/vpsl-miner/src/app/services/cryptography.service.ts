import { Injectable } from '@angular/core';
import * as eccrypto from '@toruslabs/eccrypto';
import * as openpgp from 'openpgp';

@Injectable({
  providedIn: 'root',
})
export class CryptographyService {
  public readonly fixed_iv = Buffer.from(crypto.getRandomValues(new Uint8Array(16)));
  public readonly fixed_ephemeral_key = Buffer.from(crypto.getRandomValues(new Uint8Array(32)));

  public async clientSideEncrypt(file: File, signature: string): Promise<File> {
    const fileText = await file.text();
    const message = await openpgp.createMessage({
      text: fileText,
    });

    const encrypted = await openpgp.encrypt({
      message,
      passwords: [signature],
      format: 'binary',
    });

    // Convert WebStream<Uint8Array> to BlobPart
    const response = new Response(encrypted as ReadableStream<Uint8Array>);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const encryptedBlob = new Blob([uint8Array], {
      type: 'application/json',
    });
    const encryptedFile = new File(
      [encryptedBlob],
      file.name,
      {
        type: 'application/json',
      },
    );
    return encryptedFile;
  }

  public async encryptWithWalletPublicKey(data: string, publicKey: string): Promise<string> {
    try {
      const publicKeyBytes = Buffer.from(publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey, 'hex');
      const uncompressedKey = publicKeyBytes.length === 64 ? Buffer.concat([Buffer.from([4]), publicKeyBytes]) : publicKeyBytes;

      const encryptedBuffer = await eccrypto.encrypt(uncompressedKey, Buffer.from(data), {
        iv: this.fixed_iv,
        ephemPrivateKey: this.fixed_ephemeral_key,
      });

      const encryptedHex = Buffer.concat([encryptedBuffer.iv, encryptedBuffer.ephemPublicKey, encryptedBuffer.ciphertext, encryptedBuffer.mac]).toString('hex');
      return encryptedHex;
    } catch (error: any) {
      console.error(`encryptWithWalletPublicKey error ${error.message}`);
      throw new Error('Failed to encrypt encryption key.');
    }
  }

  public generateRandomHexString() {
    // Ethereum signatures are 65 bytes (r: 32 bytes, s: 32 bytes, v: 1 byte)
    const randomBytes = new Uint8Array(65);
    window.crypto.getRandomValues(randomBytes);
    let hexString = '';
    for (let i = 0; i < randomBytes.length; i++) {
      const hex = randomBytes[i].toString(16).padStart(2, '0');
      hexString += hex;
    }
    return '0x' + hexString;
  }
}
