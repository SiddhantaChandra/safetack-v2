import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SafetyStatus from '../components/SafetyStatus';
import { SafetyProvider } from '../app/contexts/SafetyContext';

// Mock the safety context
jest.mock('../app/contexts/SafetyContext', () => {
  const originalModule = jest.requireActual('../app/contexts/SafetyContext');
  
  return {
    ...originalModule,
    useSafety: jest.fn(() => ({
      isTracking: false,
      currentJourney: null,
      loading: false,
      error: null,
      deviationStatus: null,
      startTracking: jest.fn(),
      stopTracking: jest.fn()
    }))
  };
});

// Mock Ionicons
jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native');
  return {
    Ionicons: ({ name, size, color, style }) => (
      <View style={style} testID={`icon-${name}`}>
        <Text>{name}</Text>
      </View>
    )
  };
});

describe('SafetyStatus Component', () => {
  it('renders correctly when not tracking', () => {
    const { getByText } = render(
      <SafetyProvider>
        <SafetyStatus />
      </SafetyProvider>
    );
    
    // Check that the component renders with the correct status text
    expect(getByText('Monitoring Inactive')).toBeTruthy();
    
    // Check that the start button is rendered
    expect(getByText('Start Monitoring')).toBeTruthy();
  });
  
  it('should call startTracking when the button is pressed', () => {
    const { useSafety } = require('../app/contexts/SafetyContext');
    const mockStartTracking = jest.fn();
    
    useSafety.mockReturnValue({
      isTracking: false,
      currentJourney: null,
      loading: false,
      error: null,
      deviationStatus: null,
      startTracking: mockStartTracking,
      stopTracking: jest.fn()
    });
    
    const { getByText } = render(
      <SafetyProvider>
        <SafetyStatus />
      </SafetyProvider>
    );
    
    // Press the start button
    fireEvent.press(getByText('Start Monitoring'));
    
    // Check that startTracking was called
    expect(mockStartTracking).toHaveBeenCalled();
  });
});