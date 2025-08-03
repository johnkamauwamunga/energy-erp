export const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_USER': {
      // Wrap case block in curly braces to create a new block scope
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
    
    default:
      return state;
  }
};