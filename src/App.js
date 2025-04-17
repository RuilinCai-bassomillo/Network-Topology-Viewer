import logo from './logo.svg';
import React, { useRef, useEffect, useState } from 'react';
import './App.css';
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NetworkHomepage from './Presentation/Views/NetworkHomepage.js';
import { Provider } from 'react-redux';
import { store } from './Data/Store.js';
export default function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/" element={<NetworkHomepage />} />
        </Routes>
      </Router>
    </Provider>

  )

}
