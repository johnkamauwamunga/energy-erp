export const ACTION_TYPES = {
  SET_USER: 'SET_USER',
  SET_COMPANY: 'SET_COMPANY',
  SET_COMPANIES:'SET_COMPANIES',
  SET_STATION: 'SET_STATION',
  SET_STATIONS:'SET_STATIONS',
  DELETE_STATION:'DELETE_STATION',
  LOGOUT: 'LOGOUT',
  ADD_COMPANY: 'ADD_COMPANY',
  UPDATE_COMPANY: 'UPDATE_COMPANY',
    SET_USERS: 'SET_USERS',
  ADD_USER: 'ADD_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',
  SET_USER_FILTERS: 'SET_USER_FILTERS',
  SET_ASSETS: 'SET_ASSETS',
  ADD_ASSET: 'ADD_ASSET',
  UPDATE_ASSET:'UPDATE_ASSET',
  ASSIGN_ASSET_TO_STATION: 'ASSIGN_ASSET_TO_STATION',
  UNASSIGN_ASSET_FROM_STATION: 'UNASSIGN_ASSET_FROM_STATION',
  ADD_STATION: 'ADD_STATION',
  UPDATE_STATION: 'UPDATE_STATION',
  ATTACH_ASSET_TO_STATION: 'ATTACH_ASSET_TO_STATION',
  DETACH_ASSET_FROM_STATION: 'DETACH_ASSET_FROM_STATION',
  ADD_SHIFT: 'ADD_SHIFT',
  UPDATE_SHIFT: 'UPDATE_SHIFT',
  SET_SHIFT_FILTERS: 'SET_SHIFT_FILTERS',
  ATTACH_PUMPS_TO_TANK: 'ATTACH_PUMPS_TO_TANK',
  ATTACH_ASSETS_TO_ISLAND: 'ATTACH_ASSETS_TO_ISLAND',
  ADD_ISLAND: 'ADD_ISLAND',
  ADD_WAREHOUSE: 'ADD_WAREHOUSE',
  UPDATE_WAREHOUSE: 'UPDATE_WAREHOUSE',
  ADD_NONFUEL_ITEM: 'ADD_NONFUEL_ITEM',
  UPDATE_NONFUEL_ITEM: 'UPDATE_NONFUEL_ITEM',
  UPDATE_WAREHOUSE_STOCK: 'UPDATE_WAREHOUSE_STOCK',
  TRANSFER_STOCK: 'TRANSFER_STOCK',
  ADD_OFFLOAD: 'ADD_OFFLOAD',
  SET_OFFLOAD_FILTERS: 'SET_OFFLOAD_FILTERS',
  UPDATE_TANK_LEVEL: 'UPDATE_TANK_LEVEL'
};

export const setUser = (user) => ({
  type: ACTION_TYPES.SET_USER,
  payload: user
});

export const setCompany = (company) => ({
  type: ACTION_TYPES.SET_COMPANY,
  payload: company
});

// In your actions file, add this:
export const setCompanies = (companies) => ({
  type: ACTION_TYPES.SET_COMPANIES,
  payload: companies
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

// users
// User Actions
export const setUsers = (users) => ({
  type: ACTION_TYPES.SET_USERS,
  payload: users
});

export const addUser = (user) => ({
  type: ACTION_TYPES.ADD_USER,
  payload: user
});

export const updateUser = (user) => ({
  type: ACTION_TYPES.UPDATE_USER,
  payload: user
});

export const deleteUser = (userId) => ({
  type: ACTION_TYPES.DELETE_USER,
  payload: userId
});

export const setUserFilters = (filters) => ({
  type: ACTION_TYPES.SET_USER_FILTERS,
  payload: filters
});
// In your actions file, update/add these actions:

// Unified asset actions
export const setAssets = (assets) => ({
  type: ACTION_TYPES.SET_ASSETS,
  payload: assets
});

export const addAsset = (asset) => ({
  type: ACTION_TYPES.ADD_STATION,
  payload: asset
});

export const updateAsset = (id, updates) => ({
  type: ACTION_TYPES.UPDATE_ASSET,
  payload: { id, updates }
});

export const assignAssetToStation = (assetId, stationId) => ({
  type: ACTION_TYPES.ASSIGN_ASSET_TO_STATION,
  payload: { assetId, stationId }
});

export const unassignAssetFromStation = (assetId) => ({
  type: ACTION_TYPES.UNASSIGN_ASSET_FROM_STATION,
  payload: { assetId }
});

// export const addAsset = (assetType, asset) => ({
//   type: ACTION_TYPES.ADD_ASSET,
//   payload: { assetType, asset }
// });

// export const updateAsset = (assetType, id, updates) => ({
//   type: ACTION_TYPES.UPDATE_ASSET,
//   payload: { assetType, id, updates }
// });
export const setStations = (stations) => ({
  type: ACTION_TYPES.SET_STATIONS,
  payload: stations
});

export const deleteStation = (stationId) => ({
  type: ACTION_TYPES.DELETE_STATION,
  payload: stationId
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

// Warehouse Actions
export const addWarehouse = (warehouse) => ({
  type: ACTION_TYPES.ADD_WAREHOUSE,
  payload: warehouse
});

export const updateWarehouse = (id, updates) => ({
  type: ACTION_TYPES.UPDATE_WAREHOUSE,
  payload: { id, updates }
});

export const addNonFuelItem = (warehouseId, item) => ({
  type: ACTION_TYPES.ADD_NONFUEL_ITEM,
  payload: { warehouseId, item }
});

export const updateNonFuelItem = (warehouseId, itemId, updates) => ({
  type: ACTION_TYPES.UPDATE_NONFUEL_ITEM,
  payload: { warehouseId, itemId, updates }
});

export const updateWarehouseStock = (warehouseId, itemId, newStock) => ({
  type: ACTION_TYPES.UPDATE_WAREHOUSE_STOCK,
  payload: { warehouseId, itemId, newStock }
});

export const transferStock = (fromWarehouseId, toWarehouseId, itemId, quantity) => ({
  type: ACTION_TYPES.TRANSFER_STOCK,
  payload: { fromWarehouseId, toWarehouseId, itemId, quantity }
});

export const addOffload = (offload) => ({
  type: ACTION_TYPES.ADD_OFFLOAD,
  payload: offload
});

export const setOffloadFilters = (filters) => ({
  type: ACTION_TYPES.SET_OFFLOAD_FILTERS,
  payload: filters
});

export const updateTankLevel = (tankId, newLevel) => ({
  type: ACTION_TYPES.UPDATE_TANK_LEVEL,
  payload: { tankId, newLevel }
});