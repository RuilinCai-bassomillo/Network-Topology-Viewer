import { configureStore } from '@reduxjs/toolkit';
import jsonDataReducer from './JsonDataSlice';

export const store = configureStore({
  reducer: {
    jsonData: jsonDataReducer,
  },
});