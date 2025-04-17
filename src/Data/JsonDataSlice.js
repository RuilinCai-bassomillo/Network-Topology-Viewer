// jsonDataSlice.js
import { createSlice } from '@reduxjs/toolkit';

export const jsonDataSlice = createSlice({
  name: 'jsonData',
  initialState: {
    data: null,
    fileName: ''
  },
  reducers: {
    setJsonData: (state, action) => {
      state.data = action.payload.data;
      state.fileName = action.payload.fileName;
    },
    clearJsonData: (state) => {
      state.data = null;
      state.fileName = '';
    },
  },
});

export const { setJsonData, clearJsonData } = jsonDataSlice.actions;
export default jsonDataSlice.reducer;