import { Client, Account, Databases } from 'appwrite'

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '6942423f00233dd7c427')

const account = new Account(client)
const databases = new Databases(client)

// Ping Appwrite backend to verify setup
client.ping()

export { client, account, databases }

