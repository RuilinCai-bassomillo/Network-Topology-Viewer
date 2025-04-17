import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { Button } from '@mui/material';
import ReactJson from 'react-json-view';

function ScalableDraggablePopup({ open, setOpen, title, message }) {



    const closePopup = () => {
        setOpen(false);
    };

    return (

        <Rnd
            default={{
                x: 30,
                y: 70,
                width: 600,
                height: 700,
            }}
            minWidth={200}
            minHeight={100}
            bounds="window" // Keeps it within the browser window boundaries
            style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                background: '#fff',
                boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
                padding: '16px',
                position: 'fixed',
                zIndex: 1000,
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>{title}</div>
                <div style={{ flexGrow: 1, overflow: 'auto' }}>
                    <ReactJson
                        src={message}
                        name={false}
                        theme="rjv-default"  // You can change the theme here
                        collapsed={false} // Set to `true` to collapse the data initially
                        enableClipboard={true} // Enable copy to clipboard functionality
                        displayDataTypes={false} // Hide data types
                    />
                </div>
                <Button variant="contained" color="primary" onClick={closePopup} style={{ marginTop: '8px' }}>
                    Close
                </Button>
            </div>
        </Rnd>

    );
}

export default ScalableDraggablePopup;
