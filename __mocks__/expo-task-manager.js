export const defineTask = jest.fn();
export const unregisterTaskAsync = jest.fn().mockResolvedValue();
export const isTaskRegisteredAsync = jest.fn().mockResolvedValue(true);
export const getRegisteredTasksAsync = jest.fn().mockResolvedValue([]);
export const getTaskOptionsAsync = jest.fn().mockResolvedValue({});