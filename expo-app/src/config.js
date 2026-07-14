// Point this at the backend's LAN IP - the same one you use for the Expo
// URL (exp://<IP>:8081). It can't be "localhost" here, because on a
// physical phone, "localhost" means the phone itself, not your computer.
// Should match whatever the customer app's src/config.js is pointed at,
// since both apps talk to the same backend instance.
export const API_BASE = 'http://192.168.0.101:4000';
