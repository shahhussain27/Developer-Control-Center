import React from 'react'
import Head from 'next/head'
import { Dashboard } from '../components/dashboard/Dashboard'

export default function HomePage() {
  return (
    <React.Fragment>
      <Head>
        <title>Dashboard | Developer Control Center</title>
      </Head>
      <Dashboard />
    </React.Fragment>
  )
}
