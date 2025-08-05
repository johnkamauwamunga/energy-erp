export const ACTION_TYPES = {
  SET_USER: 'SET_USER',
  SET_COMPANY: 'SET_COMPANY',
  SET_STATION: 'SET_STATION',
  LOGOUT: 'LOGOUT',
  ADD_COMPANY: 'ADD_COMPANY',
  UPDATE_COMPANY: 'UPDATE_COMPANY',
  ADD_ASSET: 'ADD_ASSET',
  UPDATE_ASSET:'UPDATE_ASSET',
  ADD_STATION: 'ADD_STATION',
  UPDATE_STATION: 'UPDATE_STATION'
};

export const setUser = (user) => ({
  type: ACTION_TYPES.SET_USER,
  payload: user
});

export const setCompany = (company) => ({
  type: ACTION_TYPES.SET_COMPANY,
  payload: company
});

export const setStation = (station) => ({
  type: ACTION_TYPES.SET_STATION,
  payload: station
});

export const logout = () => ({
  type: ACTION_TYPES.LOGOUT
});

export const addCompany = (company) => ({
  type: ACTION_TYPES.ADD_COMPANY,
  payload: company
});

export const updateCompany = (company) => ({
  type: ACTION_TYPES.UPDATE_COMPANY,
  payload: company
});

export const addAsset = (asset) => ({
  type: ACTION_TYPES.ADD_ASSET,
  payload: asset
});

export const updateAsset = (asset) => ({
  type: ACTION_TYPES.UPDATE_ASSET,
  payload: asset
});

export const addStation = (station) => ({
  type: ACTION_TYPES.ADD_STATION,
  payload: station
});

export const updateStation = (station) => ({
  type: ACTION_TYPES.UPDATE_STATION,
  payload: station
});