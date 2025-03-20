export const getPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const requestPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const setNotificationHandler = jest.fn();
export const scheduleNotificationAsync = jest.fn().mockResolvedValue('notification-id');
export const cancelScheduledNotificationAsync = jest.fn().mockResolvedValue();
export const dismissNotificationAsync = jest.fn().mockResolvedValue();
export const setNotificationCategoryAsync = jest.fn().mockResolvedValue();
export const getNotificationCategoriesAsync = jest.fn().mockResolvedValue([]);
export const addNotificationResponseReceivedListener = jest.fn().mockReturnValue({ remove: jest.fn() });
export const removeNotificationSubscription = jest.fn();

export const AndroidImportance = {
  DEFAULT: 3,
  MAX: 4,
  HIGH: 3,
  LOW: 2,
  MIN: 1,
  NONE: 0
};