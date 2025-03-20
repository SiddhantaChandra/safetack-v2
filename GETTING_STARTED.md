# SafeTack - Getting Started Guide

This guide will help you set up and run the SafeTack application on your local development environment.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) (v8 or higher)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- For iOS development: macOS with Xcode
- For Android development: Android Studio with SDK

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd safetack
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Setup environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   ```

## Running the App

1. Start the development server:
   ```
   npm start
   ```

2. Run on specific platforms:
   ```
   npm run android  # For Android
   npm run ios      # For iOS (requires macOS)
   npm run web      # For web
   ```

## Testing the App

SafeTack requires location permissions to function properly. When testing:

1. Grant all required permissions when prompted
2. For realistic testing, use a physical device as emulators have limited location capabilities
3. To test route learning, travel along similar paths multiple times
4. To test deviation detection, deviate from your established routes

## Key Features to Test

1. **Location Tracking:**
   - Start tracking on the home screen
   - Verify that the map shows your current location
   - Check that tracking continues in the background

2. **Route Learning:**
   - Take the same route multiple times
   - Visit the Routes screen to see the learned route
   - Verify that the confidence score increases

3. **Deviation Detection:**
   - Establish a regular route first
   - Then deliberately deviate from that route
   - Check for deviation alerts

4. **Emergency Contacts:**
   - Add test contacts in the Contacts screen
   - Verify they're listed correctly
   - Test the alert mechanism by simulating a deviation

## Troubleshooting

Common issues and their solutions:

1. **Location permissions not working:**
   - Check app permissions in device settings
   - Ensure location services are enabled on your device
   - Try restarting the app

2. **Database setup errors:**
   - The app will initialize SQLite on first run
   - If database errors occur, try clearing app data or reinstalling

3. **Background tracking stops:**
   - Some devices have aggressive battery management
   - Add the app to battery optimization exceptions in device settings

## Development Notes

- SQLite database is used for local storage
- Supabase integration is optional for cloud backup
- Location tracking is optimized for battery usage
- Background tasks are registered for continuous monitoring

Happy testing! If you encounter any issues, please report them in the GitHub repository.