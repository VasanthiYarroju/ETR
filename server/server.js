// Before: const express = require('express');
import express from 'express';
// Before: const cors = require('cors');
import cors from 'cors';
// Before: const https = require('https');
import https from 'https';
// Before: const querystring = require('querystring');
import querystring from 'querystring';

const app = express();
const PORT = 5000;

// OpenSky Network credentials
const OPENSKY_CLIENT_ID = 'yvasanthi314-api-client';
const OPENSKY_CLIENT_SECRET = 'mQwg9CACBuE8mIrQjfIdFSSiKFuNItO7';
const OPENSKY_USERNAME = 'yvasanthi314';
const OPENSKY_PASSWORD = 'Vasanthi@123';

// Middleware
app.use(cors());
app.use(express.json());

// OpenSky Network API endpoints
const OPENSKY_TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const OPENSKY_API_URL = 'https://opensky-network.org/api/states/all';

// Token management
let accessToken = null;
let tokenExpiry = null;
let authMethod = 'oauth2'; 

// Rate limiting variables
let lastSuccessfulData = null;
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL = 10000; 


async function getAccessToken() {
    return new Promise((resolve, reject) => {
        // Check if we have a valid token
        if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
            resolve(accessToken);
            return;
        }

        console.log('🔑 Requesting new OAuth2 access token...');

        const postData = querystring.stringify({
            'grant_type': 'client_credentials',
            'client_id': OPENSKY_CLIENT_ID,
            'client_secret': OPENSKY_CLIENT_SECRET
        });

        const options = {
            hostname: 'auth.opensky-network.org',
            port: 443,
            path: '/auth/realms/opensky-network/protocol/openid-connect/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'Earth Observation System/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        const tokenResponse = JSON.parse(data);
                        accessToken = tokenResponse.access_token;
                        
                        // Set token expiry (usually expires_in is in seconds)
                        const expiresIn = tokenResponse.expires_in || 3600; // Default to 1 hour
                        tokenExpiry = Date.now() + (expiresIn * 1000) - 60000; // Subtract 1 minute for safety
                        
                        console.log('✅ OAuth2 token obtained successfully');
                        authMethod = 'oauth2';
                        resolve(accessToken);
                    } else {
                        console.error('❌ OAuth2 token request failed:', res.statusCode, data);
                        console.log('🔄 Falling back to Basic Authentication...');
                        authMethod = 'basic';
                        reject(new Error(`OAuth2 failed: ${res.statusCode} ${data}`));
                    }
                } catch (error) {
                    console.error('❌ Error parsing OAuth2 token response:', error);
                    console.log('🔄 Falling back to Basic Authentication...');
                    authMethod = 'basic';
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ OAuth2 token request error:', error);
            console.log('🔄 Falling back to Basic Authentication...');
            authMethod = 'basic';
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// Function to make authenticated API request
async function makeAuthenticatedRequest(url) {
    return new Promise(async (resolve, reject) => {
        try {
            let options = {
                headers: {
                    'User-Agent': 'Earth Observation System/1.0',
                    'Accept': 'application/json'
                }
            };

            // Try OAuth2 first, then fall back to Basic Auth
            if (authMethod === 'oauth2') {
                try {
                    const token = await getAccessToken();
                    options.headers['Authorization'] = `Bearer ${token}`;
                } catch (error) {
                    console.log('🔄 OAuth2 failed, switching to Basic Authentication...');
                    authMethod = 'basic';
                }
            }

            // Use Basic Authentication if OAuth2 failed or is set to basic
            if (authMethod === 'basic') {
                const credentials = Buffer.from(`${OPENSKY_USERNAME}:${OPENSKY_PASSWORD}`).toString('base64');
                options.headers['Authorization'] = `Basic ${credentials}`;
                console.log('🔐 Using Basic Authentication...');
            }

            https.get(url, options, (response) => {
                let data = '';
                
                response.on('data', (chunk) => {
                    data += chunk;
                });
                
                response.on('end', () => {
                    resolve({
                        statusCode: response.statusCode,
                        data: data
                    });
                });
            }).on('error', (error) => {
                reject(error);
            });

        } catch (error) {
            reject(error);
        }
    });
}

// Flight data endpoint
app.get('/api/flights', async (req, res) => {
    try {
        const now = Date.now();
        
        // Check if we should use cached data to avoid excessive API calls
        if (lastSuccessfulData && (now - lastFetchTime) < MIN_FETCH_INTERVAL) {
            console.log('📦 Returning cached flight data (rate limit protection)');
            res.json({
                success: true,
                flights: lastSuccessfulData,
                count: lastSuccessfulData.length,
                timestamp: new Date().toISOString(),
                source: 'cached',
                auth_method: authMethod
            });
            return;
        }

        console.log('🛫 Fetching authenticated flight data from OpenSky Network...');
        
        const response = await makeAuthenticatedRequest(OPENSKY_API_URL);
        
        if (response.statusCode === 429) {
            console.log('⚠️  Rate limited by OpenSky API, using cached or mock data');
            const fallbackData = lastSuccessfulData || generateMockFlights();
            res.json({
                success: true,
                flights: fallbackData,
                count: fallbackData.length,
                timestamp: new Date().toISOString(),
                source: lastSuccessfulData ? 'cached' : 'mock',
                auth_method: authMethod
            });
            return;
        }

        if (response.statusCode === 401 || response.statusCode === 403) {
            console.log(`🔐 Authentication failed (${response.statusCode}) - trying alternative method`);
            
            // Switch authentication method and retry once
            if (authMethod === 'oauth2') {
                authMethod = 'basic';
                accessToken = null;
                tokenExpiry = null;
                console.log('🔄 Switching to Basic Authentication and retrying...');
                
                try {
                    const retryResponse = await makeAuthenticatedRequest(OPENSKY_API_URL);
                    if (retryResponse.statusCode === 200) {
                        const jsonData = JSON.parse(retryResponse.data);
                        if (jsonData && jsonData.states) {
                            const flights = processFlightData(jsonData.states);
                            lastSuccessfulData = flights;
                            lastFetchTime = now;
                            
                            console.log(`✅ Successfully fetched ${flights.length} flights with Basic Authentication`);
                            res.json({
                                success: true,
                                flights: flights,
                                count: flights.length,
                                timestamp: new Date().toISOString(),
                                source: 'live_basic_auth',
                                auth_method: 'basic'
                            });
                            return;
                        }
                    }
                } catch (retryError) {
                    console.log('❌ Retry with Basic Auth also failed');
                }
            }
            
            const fallbackData = lastSuccessfulData || generateMockFlights();
            res.json({
                success: true,
                flights: fallbackData,
                count: fallbackData.length,
                timestamp: new Date().toISOString(),
                source: lastSuccessfulData ? 'cached' : 'mock',
                warning: 'Authentication failed with both methods, using fallback data',
                auth_method: authMethod
            });
            return;
        }

        if (response.statusCode !== 200) {
            console.log(`⚠️  API returned status ${response.statusCode}, using fallback data`);
            const fallbackData = lastSuccessfulData || generateMockFlights();
            res.json({
                success: true,
                flights: fallbackData,
                count: fallbackData.length,
                timestamp: new Date().toISOString(),
                source: lastSuccessfulData ? 'cached' : 'mock',
                auth_method: authMethod
            });
            return;
        }

        const jsonData = JSON.parse(response.data);
        
        if (jsonData && jsonData.states) {
            const flights = processFlightData(jsonData.states);

            // Cache successful response
            lastSuccessfulData = flights;
            lastFetchTime = now;

            console.log(`✅ Successfully fetched ${flights.length} flights with ${authMethod} authentication`);
            res.json({
                success: true,
                flights: flights,
                count: flights.length,
                timestamp: new Date().toISOString(),
                source: authMethod === 'oauth2' ? 'live_oauth2' : 'live_basic_auth',
                auth_method: authMethod
            });
        } else {
            throw new Error('Invalid data format from OpenSky API');
        }

    } catch (error) {
        console.error('❌ Server error:', error.message);
        
        // Return cached or mock data as fallback
        const fallbackData = lastSuccessfulData || generateMockFlights();
        res.json({
            success: true,
            flights: fallbackData,
            count: fallbackData.length,
            timestamp: new Date().toISOString(),
            source: lastSuccessfulData ? 'cached' : 'mock',
            error: error.message,
            auth_method: authMethod
        });
    }
});

// Process flight data helper function
function processFlightData(states) {
    return states
        .filter(state => state[6] !== null && state[5] !== null && state[1] !== null) // Filter out flights without coordinates or callsign
        .slice(0, 2000) // Increased limit for authenticated users
        .map((state, index) => ({
            id: `${state[0]}_${index}`,
            icao24: state[0],
            callsign: state[1] ? state[1].trim() : `FLIGHT_${index}`,
            country: state[2] || 'Unknown',
            longitude: state[5],
            latitude: state[6],
            altitude: state[7] || 0,
            velocity: state[9] ? state[9] * 3.6 : 0, // Convert m/s to km/h
            heading: state[10] || 0,
            verticalRate: state[11] || 0,
            lastContact: state[4] || Date.now() / 1000,
            onGround: state[8] || false,
            timePosition: state[3],
            geoAltitude: state[13],
            squawk: state[14],
            spi: state[15],
            positionSource: state[16]
        }));
}

// Get flights within a bounding box (authenticated endpoint)
app.get('/api/flights/bounds', async (req, res) => {
    try {
        const { lamin, lomin, lamax, lomax } = req.query;
        
        if (!lamin || !lomin || !lamax || !lomax) {
            return res.status(400).json({
                error: 'Missing required parameters: lamin, lomin, lamax, lomax'
            });
        }

        console.log(`🗺️  Fetching flights in bounds: ${lamin},${lomin} to ${lamax},${lomax}`);
        
        const url = `${OPENSKY_API_URL}?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
        const response = await makeAuthenticatedRequest(url);
        
        if (response.statusCode !== 200) {
            throw new Error(`API returned status ${response.statusCode}`);
        }

        const jsonData = JSON.parse(response.data);
        
        if (jsonData && jsonData.states) {
            const flights = processFlightData(jsonData.states);

            res.json({
                success: true,
                flights: flights,
                count: flights.length,
                timestamp: new Date().toISOString(),
                bounds: { lamin, lomin, lamax, lomax },
                source: authMethod === 'oauth2' ? 'live_oauth2' : 'live_basic_auth',
                auth_method: authMethod
            });
        } else {
            throw new Error('Invalid data format from OpenSky API');
        }

    } catch (error) {
        console.error('❌ Error in bounds endpoint:', error.message);
        res.status(500).json({
            error: 'Failed to fetch flight data',
            message: error.message,
            auth_method: authMethod
        });
    }
});

// Generate mock flight data as fallback
function generateMockFlights() {
    const mockFlights = [];
    const airlines = ['UAL', 'DAL', 'AAL', 'SWA', 'BAW', 'AFR', 'DLH', 'KLM', 'ANA', 'JAL'];
    
    for (let i = 0; i < 100; i++) {
        const airline = airlines[Math.floor(Math.random() * airlines.length)];
        const flightNumber = Math.floor(Math.random() * 9000) + 1000;
        
        mockFlights.push({
            id: `mock_${i}`,
            icao24: `${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            callsign: `${airline}${flightNumber}`,
            country: ['USA', 'UK', 'Germany', 'France', 'Japan', 'Netherlands', 'Canada'][Math.floor(Math.random() * 7)],
            longitude: (Math.random() - 0.5) * 360,
            latitude: (Math.random() - 0.5) * 150, // Limit latitude to avoid polar regions
            altitude: Math.random() * 12000 + 3000,
            velocity: Math.random() * 400 + 200,
            heading: Math.random() * 360,
            verticalRate: (Math.random() - 0.5) * 20,
            lastContact: Date.now() / 1000,
            onGround: false,
            timePosition: Date.now() / 1000 - Math.floor(Math.random() * 60),
            geoAltitude: null,
            squawk: null,
            spi: false,
            positionSource: 0
        });
    }
    
    return mockFlights;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        authenticated: true,
        auth_method: authMethod,
        opensky_client_id: OPENSKY_CLIENT_ID,
        opensky_username: OPENSKY_USERNAME,
        token_status: accessToken ? 'valid' : 'not_obtained'
    });
});

// API info endpoint
app.get('/api/info', (req, res) => {
    res.json({
        name: 'Earth Observation Flight Tracker API',
        version: '4.0.0',
        description: 'Real-time flight tracking using OpenSky Network API with hybrid authentication',
        endpoints: {
            '/api/flights': 'Get all current flights',
            '/api/flights/bounds': 'Get flights within bounding box (requires lamin, lomin, lamax, lomax query params)',
            '/api/health': 'Health check',
            '/api/info': 'API information'
        },
        features: [
            'Hybrid authentication (OAuth2 + Basic Auth fallback)',
            'Real-time flight data',
            'Bounding box filtering',
            'Rate limiting protection',
            'Automatic authentication method switching',
            'Fallback to cached/mock data'
        ],
        current_auth_method: authMethod
    });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🛫 Earth Observation Server running on port ${PORT}`);
    console.log(`🌍 Flight data available at http://localhost:${PORT}/api/flights`);
    console.log(`📊 Health check at http://localhost:${PORT}/api/health`);
    console.log(`🔐 Using hybrid authentication (OAuth2 + Basic Auth fallback)`);
    console.log(`🆔 Client ID: ${OPENSKY_CLIENT_ID}`);
    console.log(`👤 Username: ${OPENSKY_USERNAME}`);
});

// Before: module.exports = app;
export default app;