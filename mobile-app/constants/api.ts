import { Platform } from 'react-native';

const BACKEND_URL =
  Platform.OS === 'web'
    ? 'http://localhost:8000'
    : 'http://10.209.182.1:8000';

export default BACKEND_URL;
