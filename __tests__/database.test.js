import { Database } from '../app/database/database';
import * as SQLite from 'expo-sqlite';

// Mock SQLite module
jest.mock('expo-sqlite');

describe('Database', () => {
  let database;

  beforeEach(() => {
    // Clear all mock calls between tests
    jest.clearAllMocks();
    
    // Create a new database instance
    database = new Database();
  });

  it('should be a singleton', () => {
    const instance1 = Database.getInstance();
    const instance2 = Database.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  it('should open the database on initialization', () => {
    expect(SQLite.openDatabase).toHaveBeenCalledWith('safetack.db');
  });

  it('should setup tables on initialization', () => {
    expect(database.db.transaction).toHaveBeenCalled();
  });

  it('should execute queries correctly', async () => {
    const mockQuery = 'SELECT * FROM Routes';
    const mockParams = [1, 2, 3];
    
    await database.executeQuery(mockQuery, mockParams);
    
    // Check if transaction was called
    expect(database.db.transaction).toHaveBeenCalled();
    
    // Get the transaction callback
    const transactionCallback = database.db.transaction.mock.calls[1][0];
    
    // Create a mock transaction object
    const mockTx = {
      executeSql: jest.fn()
    };
    
    // Call the transaction callback with the mock transaction
    transactionCallback(mockTx);
    
    // Check if executeSql was called with the right parameters
    expect(mockTx.executeSql).toHaveBeenCalledWith(
      mockQuery, 
      mockParams, 
      expect.any(Function), 
      expect.any(Function)
    );
  });
});