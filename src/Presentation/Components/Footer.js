import * as React from 'react';
import Grid from "@mui/material/Grid";

export default function Footer() {
    return (
        
            <Grid container >
                <Grid item xs={6} container direction="column" alignContent="flex-start" justifyContent="flex-start" spacing={1} >
                    <div style={{ display: 'flex', marginLeft: 80, marginTop: 40 }}>
                        <p style={{ color: "#FFFFFF", fontFamily: "Times New Roman" }}>
                            @Huawei Ottawa Advanced Optical Technology Lab
                        </p>

                    </div>
                    <div style={{ display: 'flex', marginLeft: 80, marginTop: 3, marginBottom: 40 }}>
                        <a
                            href="https://w3.huawei.com"  style={{color:"#ffcc80",fontFamily: "Times New Roman"}}>
                                Huawei
                            </a>
                    </div>
                </Grid>
                <Grid item xs={6} container direction="column" alignContent="flex-end" justifyContent="flex-end" spacing={1} >
                    <div style={{ display: 'flex', marginRight: 80, marginTop: 40 }}>
                        <p style={{ color: "#FFFFFF",fontFamily: "Times New Roman" }}>
                            NaaS Viewer Developer: Ruilin Cai
                        </p>
                    </div>
                    <div style={{ display: 'flex', marginRight: 80, marginTop: 3, marginBottom: 40 }}>
                        <a href="mailto:alfred.kong@lumentum.com" style={{color:"#ffcc80",fontFamily: "Times New Roman"}}>
                            Group Manager: Henry Yu (henry.yu1@huawei.com)
                        </a>

                    </div>
                </Grid>
            </Grid>
        
    );
}


