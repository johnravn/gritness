import { Client, Account, Databases } from 'appwrite'

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('6942423f00233dd7c427')

const account = new Account(client)
const databases = new Databases(client)

// Ping Appwrite backend to verify setup
client.ping()

export { client, account, databases }

