
import { Client } from './client';

import fetch from 'node-fetch';

const API_VERSION = '';
const API_URL = `https://api.guac.live/${API_VERSION}`;
const USER_AGENT = 'guac.js (Version 1.0.0) - https://github.com/guaclive/guac.js';

export class Rest {
    client: Client;
    token: string;
    API_HEADERS: {
        authorization: string,
        'user-agent': string
    };

    async init(client: Client) {
        this.client = client;

        if (client.options.clientType === 'bot') this.token = `Bot ${client.token}`;
        else this.token = client.token;

        this.API_HEADERS = {
            authorization: this.token,
            'user-agent': USER_AGENT
        };
    }

    async build({method = 'GET', path = '/', data = {}, headers}) {
        try {
            let opts = {
                headers: {...headers, ...this.API_HEADERS},
                method,
                data
            };

            if (data) {
                opts.headers['content-type'] = 'application/json';
            }
            else opts.headers['content-type'] = 'text/plain';

            let res = await fetch(`${API_URL}${path}`, opts);

            return res;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async get(path: string, {headers} = {headers: {}}) {
        return this.build({method: 'GET', path, headers});
    }

    async post(path: string, {data, headers} = {data: {}, headers: {}}) {
        return this.build({method: 'POST', path, data, headers});
    }

    async patch(path: string, {data, headers} = {data: {}, headers: {}}) {
        return this.build({method: 'PATCH', path, data, headers});
    }

    async delete(path: string, {data, headers} = {data: {}, headers: {}}) {
        return this.build({method: 'DELETE', path, data, headers});
    }
}