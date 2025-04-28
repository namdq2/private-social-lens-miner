# Vana Refinement Service Integration

This document outlines the implementation of the Vana Refinement Service integration according to the VRC-15 requirements.

## Overview

The Refinement Service API integration allows the system to convert collected Telegram data into a structured queryable format by sending it to Vana's Refinement Service. The integration follows the VRC-15 standard and ensures data security and compliance with Vana Data Registry standards.

## Implementation Details

### New Service

A new service `RefinementApiService` has been created to handle communication with the Refinement Service API. This service:

- Makes HTTP requests to the Refinement Service endpoint
- Passes the necessary data (fileId, encryption key, and refiner ID)
- Handles error cases gracefully

### Updated Components

1. **GelatoApiService**: 
   - Modified to expose the fileId using an Angular signal
   - Updated to display fileId in UI messages
   - Changed all references to fileId to use the signal

2. **TelegramApiService**:
   - Updated to call the Refinement Service after file submission
   - Added polling mechanism to wait for fileId to be available
   - Improved error handling to continue normal flow even if refinement fails

3. **SubmissionProcessingComponent**:
   - Updated to display the fileId in the UI
   - Added a getter for fileId to expose it to the template

### Configuration Updates

Added two new optional configuration parameters to the `IVana` interface:

- `refinementServiceUrl`: URL of the Refinement Service API
- `refinerId`: ID of the registered refiner in the Data Refiner Registry

## How to Configure

Update your `config.json` file to include the new parameters:

```json
"vana": {
  ...existing configuration...
  "refinementServiceUrl": "https://a7df0ae43df690b889c1201546d7058ceb04d21b-8000.dstack-prod5.phala.network/refine",
  "refinerId": 12
}
```

If these parameters are not provided, default values will be used.

## User Experience

From a user perspective:

1. The user submits data through the normal flow
2. After submission, the fileId is displayed in the UI
3. The system automatically calls the Refinement Service 
4. The user is notified of the refinement process completion

## Error Handling

- If the refinement process fails, the submission process continues normally
- Error messages are logged to the console but don't interrupt the user experience
- Appropriate feedback is provided in the UI

## Default Values

If configuration parameters are not provided, the system uses these defaults:

- Default Refinement Service URL: `https://a7df0ae43df690b889c1201546d7058ceb04d21b-8000.dstack-prod5.phala.network/refine`
- Default Refiner ID: `12`

## Testing

To test the integration:

1. Configure the correct refinerId in your environment
2. Submit data through the normal flow
3. Verify that the fileId is displayed in the UI
4. Check the console logs for successful refinement API calls 