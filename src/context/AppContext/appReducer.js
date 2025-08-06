export const appReducer = (state, action) => {
  switch (action.type) {
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
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');

      return {
        ...state,
        currentUser: null,
        currentCompany: null,
        currentStation: null,
        isAuthenticated: false
      };
    }
    
    case 'SET_COMPANY': {
      return {
        ...state,
        currentCompany: action.payload,
        currentStation: null
      };
    }
      
    case 'SET_STATION': {
      return {
        ...state,
        currentStation: action.payload
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

    case 'ADD_ASSET': {
      const { assetType, asset } = action.payload;
      
      return {
        ...state,
        assets: {
          ...state.assets,
          [assetType]: [...state.assets[assetType], asset]
        }
      };
    }

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
    
    default:
      return state;
  }
};