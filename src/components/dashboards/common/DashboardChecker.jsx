import React, {useState, useEffect} from 'react'
import { stationService } from '../../../services/stationService/stationService';
import { userService } from '../../../services/userService/userService';
import { supplierService } from '../../../services/supplierService/supplierService';
import { debtorService } from '../../../services/debtorService/debtorService';
import { purchaseService } from '../../../services/purchaseService/purchaseService';
import { fuelService } from '../../../services/fuelService/fuelService';
import { useApp } from '../../../context/AppContext';
const DashboardChecker = () => {

    useEffect(()=>{
    fetchStations()
    fetchUsers()
    fetchSuppliers()
    fetchDebtors()
    fetchPurchases()
    fetchFuelProducts()
    },[])

    const fetchStations = async()=>{
    const response = await stationService.getCompanyStations()
    console.log("responding with company stations ",response)
    }

    const fetchUsers = async()=>{
    const response = await userService.getUsers()
    console.log("Company users ",response.data)
    }

    
    const fetchSuppliers = async()=>{
    const response = await supplierService.getSuppliers()
    console.log("Company suppliers ",response)
    }

   const fetchPurchases = async()=>{
    const response = await purchaseService.getPurchases()
    console.log("Company purchases ",response)
    }

    const fetchFuelProducts = async()=>{
    const response = await fuelService.getFuelProducts()
    console.log("Company fuel products ",response)
    }

    const fetchDebtors = async()=>{
    const response = await debtorService.getDebtors()
    console.log("Company Debtors ",response)
    }

  return (
    <div>DashboardChecker</div>
  )
}

export default DashboardChecker