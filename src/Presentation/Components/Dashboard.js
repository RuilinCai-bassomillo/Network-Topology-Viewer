import React, { useState, useEffect, useRef } from 'react';
import { Route, Link, Routes, useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import AdbIcon from '@mui/icons-material/Adb';
import StorageIcon from '@mui/icons-material/Storage';
import HubIcon from '@mui/icons-material/Hub';
import { AccountCircle } from '@mui/icons-material';
import { ThemeProvider } from '@emotion/react';
import theme from '../Views/Theme';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import RestoreIcon from '@mui/icons-material/Restore';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { Badge } from '@mui/material';
export default function Dashboard({setOpen, updateState, setUpdateState}) {
    const navigate = useNavigate();
    const location = useLocation();
    //const [pages, setPages] = React.useState(['Network Topology Layer'])
    const [pages, setPages] = React.useState([])
    const [buttonStatusArray, setButtonStatusAray] = React.useState([1, 0, 0]);
    const [anchorElNav, setAnchorElNav] = React.useState(null);
    const handleClickNavigator = (page) => {
        switch (page) {
            case "Network Topology Layer":


            
                handleClickNetworkTopology();
                break;


        }

    }
    useEffect(() => {
        if (location.pathname === "/") {
            setButtonStatusAray([1, 0, 0])
        }
    }, [])
    const handleClickNetworkTopology = () => {
        handleCloseNavMenu();
        navigate('/')
    }
    const handleOpenNavMenu = (event) => {
        setAnchorElNav(event.currentTarget);
    };

    const handleCloseNavMenu = () => {
        setAnchorElNav(null);
    };
    const handleReload = () => {
        setOpen(true)
        // window.location.reload();
    };
    const handleUpdate=()=>{
        setUpdateState(!updateState)

    }
    const renderPageNavigator = (page, i) => {
        if (buttonStatusArray[i] === 1) {
            return (
                <Button
                    key={page}
                    onClick={() => { handleClickNavigator(page) }}
                    sx={{
                        my: 2, color: 'white', display: 'block', fontFamily: "Times New Roman", backgroundColor: "#37474f", mr: 0, ':hover': {
                            bgcolor: '#455a64', // theme.palette.primary.main
                            color: '#ffffff',
                        }
                    }}
                >
                    {page}
                </Button>)
        } else {
            return (
                <Button
                    key={page}
                    onClick={() => { handleClickNavigator(page) }}
                    sx={{
                        my: 2, color: 'white', display: 'block', fontFamily: "Times New Roman", mr: 0, ':hover': {

                            color: '#ffe082',
                        }
                    }}
                >
                    {page}
                </Button>)
        }
    }
    return (
        <ThemeProvider theme={theme}>
            <AppBar position="fixed" style={{ backgroundColor: "#607d8b" }}>
                <Container maxWidth="xxxl">
                    <Toolbar
                     variant="dense"
                     sx={{ minHeight: 50, height: 50 }}>
                        <HubIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
                        <Typography
                            variant="h6"
                            noWrap
                            component="a"
                            href="/"
                            sx={{
                                mr: 2,
                                display: { xs: 'none', md: 'flex' },
                                fontFamily: "Times New Roman",
                                fontWeight: 700,
                                // letterSpacing: '.3rem',
                                color: 'inherit',
                                textDecoration: 'none',
                            }}
                        >
                            Network Topology Viewer
                        </Typography>


                        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
                            {pages.map((page, i) => (
                                renderPageNavigator(page, i)

                            ))}
                        </Box>
                        <Tooltip title="Update the network topology">

                            <Button onClick={handleUpdate} variant="outlined" sx={{
                                 height: 30,
                                 padding: '0 12px', // Adjust horizontal padding
                                 lineHeight: '1.2',
                                my: 0, color: 'white', display: 'block', fontFamily: "Times New Roman", backgroundColor: "#37474f", mr: 2, ':hover': {
                                    bgcolor: '#455a64', // theme.palette.primary.main
                                    color: '#ffffff',
                                }
                            }}>Update Topology</Button>
                        </Tooltip>
                        <Tooltip title="Upload the json file">

                            <Button onClick={handleReload} variant="outlined" sx={{
                                 height: 30,
                                 padding: '0 12px', // Adjust horizontal padding
                                 lineHeight: '1.2',
                                my: 0, color: 'white', display: 'block', fontFamily: "Times New Roman", backgroundColor: "#37474f", mr: 0, ':hover': {
                                    bgcolor: '#455a64', // theme.palette.primary.main
                                    color: '#ffffff',
                                }
                            }}>Upload File</Button>
                        </Tooltip>
                    </Toolbar>
                </Container>
            </AppBar>
        </ThemeProvider>
    )
}
