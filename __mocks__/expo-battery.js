export const getBatteryLevelAsync = jest.fn().mockResolvedValue(0.75);
export const getPowerStateAsync = jest.fn().mockResolvedValue({ 
  batteryLevel: 0.75,
  batteryState: 1,
  lowPowerMode: false
});
export const isLowPowerModeEnabledAsync = jest.fn().mockResolvedValue(false);
export const addLowPowerModeListener = jest.fn().mockReturnValue({ remove: jest.fn() });
export const addBatteryLevelListener = jest.fn().mockReturnValue({ remove: jest.fn() });
export const addBatteryStateListener = jest.fn().mockReturnValue({ remove: jest.fn() });

export const BatteryState = {
  UNKNOWN: 0,
  UNPLUGGED: 1,
  CHARGING: 2,
  FULL: 3
};