export const openDatabase = jest.fn().mockReturnValue({
  transaction: jest.fn((callback, errorCallback, successCallback) => {
    const tx = {
      executeSql: jest.fn((query, params, successCallback) => {
        const result = {
          rows: {
            length: 0,
            _array: []
          },
          insertId: 1,
          rowsAffected: 0
        };
        successCallback && successCallback(tx, result);
      })
    };
    callback(tx);
    successCallback && successCallback();
  })
});