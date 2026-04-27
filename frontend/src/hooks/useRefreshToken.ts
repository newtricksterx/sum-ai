import { useCallback } from 'react';
import axios from 'axios';

const useRefreshToken = () => {
  const refresh = useCallback(async () => {
    const response = await axios.get('/refresh', {
      withCredentials: true,
    });
    // Assuming the response contains the new access token
    // You might want to set it in localStorage or context
    localStorage.setItem('accessToken', response.data.accessToken);
    return response.data.accessToken;
  }, []);

  return refresh;
};

export default useRefreshToken;