import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import SingleFileUploader from './SingleFileLoader';

export default function UploadFileDialog({ open, setOpen,updateState, setUpdateState }) {
    const handleClose = () => {
        setOpen(false);
        setUpdateState(!updateState)
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
            maxWidth="md" // Makes dialog wider to accommodate content
            fullWidth // Uses full width available
        >
            <DialogTitle id="alert-dialog-title">
                File Upload
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    Please select a JSON file to upload:
                </DialogContentText>
                {/* Add the SingleFileUploader component here */}
                <div style={{ marginTop: '16px' }}>
                    <SingleFileUploader />
                </div>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}