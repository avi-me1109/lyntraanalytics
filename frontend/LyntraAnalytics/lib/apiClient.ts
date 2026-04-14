const BASE_URL = 'http://localhost:3000';

export const apiClient = {
  get: async (table: string, query: string = '') => {
    const response = await fetch(`${BASE_URL}/${table}?${query}`);
    return await response.json();
  },
  
  upsert: async (table: string, data: object) => {
    return await fetch(`${BASE_URL}/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates' // This is the "upsert" equivalent
      },
      body: JSON.stringify(data)
    });
  }
};