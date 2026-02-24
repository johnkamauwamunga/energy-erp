
import React,{useEffect, useState} from 'react'
import {reconciliationService} from '../../../services/reconcilliationService/reconcilliationService'

const ReconciliationTest = () => {

    const fetchShifts = async () => {
  
      
      const response = await reconciliationService.getShiftsByDateRange();

      console.log("this is the reconcilliation raw data ",response)
      
     
      
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  return (
    <div>ReconciliationTest</div>
  )
}

export default ReconciliationTest