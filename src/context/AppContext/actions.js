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
  UPDATE_STATION: 'UPDATE_STATION',
  ATTACH_ASSET_TO_STATION: 'ATTACH_ASSET_TO_STATION',
  DETACH_ASSET_FROM_STATION: 'DETACH_ASSET_FROM_STATION',
  ADD_SHIFT: 'ADD_SHIFT',
  UPDATE_SHIFT: 'UPDATE_SHIFT',
  SET_SHIFT_FILTERS: 'SET_SHIFT_FILTERS',
  ATTACH_PUMPS_TO_TANK: 'ATTACH_PUMPS_TO_TANK',
  ATTACH_ASSETS_TO_ISLAND: 'ATTACH_ASSETS_TO_ISLAND',
  ADD_ISLAND: 'ADD_ISLAND'
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

export const addAsset = (assetType, asset) => ({
  type: ACTION_TYPES.ADD_ASSET,
  payload: { assetType, asset }
});

export const updateAsset = (assetType, id, updates) => ({
  type: ACTION_TYPES.UPDATE_ASSET,
  payload: { assetType, id, updates }
});

export const addStation = (station) => ({
  type: ACTION_TYPES.ADD_STATION,
  payload: station
});

export const updateStation = (station) => ({
  type: ACTION_TYPES.UPDATE_STATION,
  payload: station
});

// Add new action creators
export const attachAssetToStation = (stationId, assetId, assetType) => ({
  type: ACTION_TYPES.ATTACH_ASSET_TO_STATION,
  payload: { stationId, assetId, assetType }
});

export const detachAssetFromStation = (assetId, assetType) => ({
  type: ACTION_TYPES.DETACH_ASSET_FROM_STATION,
  payload: { assetId, assetType }
});

// station level

// Shift Actions
export const addShift = (shift) => ({
  type: ACTION_TYPES.ADD_SHIFT,
  payload: shift
});

export const updateShift = (shift) => ({
  type: ACTION_TYPES.UPDATE_SHIFT,
  payload: shift
});

export const setShiftFilters = (filters) => ({
  type: ACTION_TYPES.SET_SHIFT_FILTERS,
  payload: filters
});

// Asset Management Actions
export const attachPumpsToTank = (tankId, pumpIds) => ({
  type: ACTION_TYPES.ATTACH_PUMPS_TO_TANK,
  payload: { tankId, pumpIds }
});

export const attachAssetsToIsland = (islandId, tankIds, pumpIds) => ({
  type: ACTION_TYPES.ATTACH_ASSETS_TO_ISLAND,
  payload: { islandId, tankIds, pumpIds }
});

export const addIsland = (island) => ({
  type: ACTION_TYPES.ADD_ISLAND,
  payload: island
});
