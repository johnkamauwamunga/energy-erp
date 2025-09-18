export const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_AUTH_DATA': {
      const { user, company, station, permissions, accessToken, refreshToken } = action.payload;
      
      return {
        ...state,
        currentUser: user,
        currentCompany: company,
        currentStation: station,
        permissions: permissions,
        isAuthenticated: true,
        accessToken: accessToken,
        refreshToken: refreshToken
      };
    }
      
    case 'SET_USER': {
      const user = action.payload;
      let currentCompany = null;
      let currentStation = null;
      
      if (user.companyId) {
        currentCompany = state.companies.find(c => c.id === user.companyId) || null;
      }
      
      if (user.stationId) {
        currentStation = state.serviceStations.find(s => s.id === user.stationId) || null;
      }
      
      return {
        ...state,
        currentUser: user,
        currentCompany,
        currentStation,
        isAuthenticated: true
      };
    }
      
    case 'LOGOUT': {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('authData');

      return {
        ...state,
        currentUser: null,
        currentCompany: null,
        currentStation: null,
        permissions: null,
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null
      };
    }
    
    case 'SET_COMPANY': {
      return {
        ...state,
        currentCompany: action.payload,
        currentStation: null
      };
    }

    // In your reducer, add this case:
case 'SET_COMPANIES':
  return {
    ...state,
    companies: action.payload
  };
      
    case 'SET_STATION': {
      return {
        ...state,
        currentStation: action.payload
      };
    }
    
    case 'SET_PERMISSIONS': {
      return {
        ...state,
        permissions: action.payload
      };
    }
    
    case 'UPDATE_TOKENS': {
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken
      };
    }
    
    case 'ADD_COMPANY': {
      return {
        ...state,
        companies: [...state.companies, action.payload]
      };
    }
      
    case 'UPDATE_COMPANY': {
      return {
        ...state,
        companies: state.companies.map(c => 
          c.id === action.payload.id ? action.payload : c
        )
      };
    }

// In your reducer, update the asset handling cases:

case 'SET_ASSETS':
  return {
    ...state,
    assets: action.payload
  };

case 'ADD_ASSET':
  return {
    ...state,
    assets: [...state.assets, action.payload]
  };

// case 'UPDATE_ASSET':
//   const { id, updates } = action.payload;
//   return {
//     ...state,
//     assets: state.assets.map(asset => 
//       asset.id === id ? { ...asset, ...updates } : asset
//     )
//   };

case 'ASSIGN_ASSET_TO_STATION':
  return {
    ...state,
    assets: state.assets.map(asset => 
      asset.id === action.payload.assetId 
        ? { ...asset, stationId: action.payload.stationId, status: 'ASSIGNED' } 
        : asset
    )
  };

case 'UNASSIGN_ASSET_FROM_STATION':
  return {
    ...state,
    assets: state.assets.map(asset => 
      asset.id === action.payload.assetId 
        ? { ...asset, stationId: null, status: 'REGISTERED' } 
        : asset
    )
  };

// Remove the old assetType-based cases

    // case 'ADD_ASSET': {
    //   const { assetType, asset } = action.payload;
      
    //   return {
    //     ...state,
    //     assets: {
    //       ...state.assets,
    //       [assetType]: [...state.assets[assetType], asset]
    //     }
    //   };
    // }

    case 'UPDATE_ASSET': {
      const { assetType, id, updates } = action.payload;
      
      return {
        ...state,
        assets: {
          ...state.assets,
          [assetType]: state.assets[assetType].map(item => 
            item.id === id ? { ...item, ...updates } : item
          )
        }
      };
    }

 case 'SET_STATIONS':
  return {
    ...state,
    serviceStations: action.payload
  };

      
    case 'ADD_STATION': {
      return {
        ...state,
        serviceStations: [...state.serviceStations, action.payload]
      };
    }
      
    case 'UPDATE_STATION': {
      return {
        ...state,
        serviceStations: state.serviceStations.map(s => 
          s.id === action.payload.id ? action.payload : s
        )
      };
    }
    
    case 'DELETE_STATION': {
      return {
        ...state,
        serviceStations: state.serviceStations.filter(s => s.id !== action.payload)
      };
    }
    

    case 'ATTACH_ASSET_TO_STATION': {
      const { stationId, assetId, assetType } = action.payload;
      
      return {
        ...state,
        assets: {
          ...state.assets,
          [assetType]: state.assets[assetType].map(asset => 
            asset.id === assetId ? { ...asset, stationId } : asset
          )
        }
      };
    }
    
    case 'DETACH_ASSET_FROM_STATION': {
      const { assetId, assetType } = action.payload;
      
      return {
        ...state,
        assets: {
          ...state.assets,
          [assetType]: state.assets[assetType].map(asset => 
            asset.id === assetId ? { ...asset, stationId: null } : asset
          )
        }
      };
    }

    case 'ADD_OFFLOAD':
      return {
        ...state,
        offloads: [...(state.offloads || []), action.payload]
      };
      
    case 'SET_OFFLOAD_FILTERS':
      return {
        ...state,
        offloadFilters: { ...(state.offloadFilters || {}), ...action.payload }
      };
      
    case 'UPDATE_TANK_LEVEL': {
      const { tankId, newLevel } = action.payload;
      return {
        ...state,
        assets: {
          ...state.assets,
          tanks: state.assets.tanks.map(tank => 
            tank.id === tankId ? { ...tank, currentLevel: newLevel } : tank
          )
        }
      };
    }

    // user bits
    case 'SET_USERS':
  return {
    ...state,
    users: action.payload
  };

case 'ADD_USER':
  return {
    ...state,
    users: [...state.users, action.payload]
  };

case 'UPDATE_USER':
  return {
    ...state,
    users: state.users.map(user => 
      user.id === action.payload.id ? action.payload : user
    )
  };

case 'DELETE_USER':
  return {
    ...state,
    users: state.users.filter(user => user.id !== action.payload)
  };

case 'SET_USER_FILTERS':
  return {
    ...state,
    userFilters: { ...state.userFilters, ...action.payload }
  };

    // Shift Management Cases
    case 'ADD_SHIFT': {
      return {
        ...state,
        shifts: [...state.shifts, action.payload]
      };
    }
    
    case 'UPDATE_SHIFT': {
      return {
        ...state,
        shifts: state.shifts.map(shift => 
          shift.id === action.payload.id ? action.payload : shift
        )
      };
    }

    case 'SET_SHIFT_FILTERS': {
      return {
        ...state,
        shiftFilters: action.payload
      };
    }
    
    // Asset Relationship Cases
    case 'ATTACH_PUMPS_TO_TANK': {
      const { tankId, pumpIds } = action.payload;
      
      // Get islandId from tank
      const tank = state.assets.tanks.find(t => t.id === tankId);
      const islandId = tank ? tank.islandId : null;
      
      return {
        ...state,
        assets: {
          ...state.assets,
          pumps: state.assets.pumps.map(pump => {
            if (pumpIds.includes(pump.id)) {
              return {
                ...pump,
                tankId,
                islandId
              };
            }
            return pump;
          })
        }
      };
    }

    case 'ATTACH_ASSETS_TO_ISLAND': {
      const { islandId, tankIds, pumpIds } = action.payload;
      
      return {
        ...state,
        assets: {
          ...state.assets,
          tanks: state.assets.tanks.map(tank => 
            tankIds.includes(tank.id) ? { ...tank, islandId } : tank
          ),
          pumps: state.assets.pumps.map(pump => 
            pumpIds.includes(pump.id) ? { ...pump, islandId } : pump
          )
        }
      };
    }

    case 'ADD_ISLAND': {
      return {
        ...state,
        islands: [...state.islands, action.payload]
      };
    }

    // Warehouse Management Cases
    case 'ADD_WAREHOUSE': {
      return {
        ...state,
        warehouses: [...state.warehouses, action.payload]
      };
    }

    case 'UPDATE_WAREHOUSE': {
      const { id, updates } = action.payload;
      return {
        ...state,
        warehouses: state.warehouses.map(wh =>
          wh.id === id ? { ...wh, ...updates } : wh
        )
      };
    }

    case 'ADD_NONFUEL_ITEM': {
      const { warehouseId, item } = action.payload;
      return {
        ...state,
        warehouses: state.warehouses.map(wh =>
          wh.id === warehouseId
            ? {
                ...wh,
                nonFuelItems: [...(wh.nonFuelItems || []), item]
              }
            : wh
        )
      };
    }

    case 'UPDATE_NONFUEL_ITEM': {
      const { warehouseId, itemId, updates } = action.payload;
      return {
        ...state,
        warehouses: state.warehouses.map(wh =>
          wh.id === warehouseId
            ? {
                ...wh,
                nonFuelItems: wh.nonFuelItems.map(item =>
                  item.itemId === itemId ? { ...item, ...updates } : item
                )
              }
            : wh
        )
      };
    }

    case 'UPDATE_WAREHOUSE_STOCK': {
      const { warehouseId, itemId, newStock } = action.payload;
      return {
        ...state,
        warehouses: state.warehouses.map(wh =>
          wh.id === warehouseId
            ? {
                ...wh,
                nonFuelItems: wh.nonFuelItems.map(item =>
                  item.itemId === itemId
                    ? { ...item, currentStock: newStock }
                    : item
                )
              }
            : wh
        )
      };
    }

    case 'TRANSFER_STOCK': {
      const { itemId, fromWarehouseId, toWarehouseId, quantity } = action.payload;
      
      // Find source and target warehouses
      const fromWarehouse = state.warehouses.find(wh => wh.id === fromWarehouseId);
      const toWarehouse = state.warehouses.find(wh => wh.id === toWarehouseId);
      
      if (!fromWarehouse || !toWarehouse) return state;
      
      // Find source item
      const fromItem = fromWarehouse.nonFuelItems?.find(item => item.itemId === itemId);
      if (!fromItem || fromItem.currentStock < quantity) return state;
      
      return {
        ...state,
        warehouses: state.warehouses.map(wh => {
          // Update source warehouse
          if (wh.id === fromWarehouseId) {
            return {
              ...wh,
              nonFuelItems: wh.nonFuelItems.map(item =>
                item.itemId === itemId
                  ? { ...item, currentStock: item.currentStock - quantity }
                  : item
              )
            };
          }
          
          // Update target warehouse
          if (wh.id === toWarehouseId) {
            const existingItem = wh.nonFuelItems?.find(item => item.itemId === itemId);
            
            return {
              ...wh,
              nonFuelItems: existingItem
                ? wh.nonFuelItems.map(item =>
                    item.itemId === itemId
                      ? { ...item, currentStock: item.currentStock + quantity }
                      : item
                  )
                : [...(wh.nonFuelItems || []), { ...fromItem, currentStock: quantity }]
            };
          }
          
          return wh;
        })
      };
    }

    default:
      return state;
  }
};