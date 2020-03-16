// Modules
import {EventEmitter} from 'events';
import * as io from 'socket.io-client';

import {Rest} from './Rest';
import fetch from 'node-fetch';

interface UserInterface {
	activated?: 1 | 0,
	anon?: Boolean,
	badges?: Array<Object>,
	banned?: Boolean,
	color?: string,
	heartbeat?: number,
	id?: string,
	lastMessage?: number,
	name?: string,
	timeout?: number,
	type?: string
}
interface MessageInterface {
	time?: Date,
	type: string,
	content: string,
	author: UserInterface
}
interface MessagesInterface {
	[position: number]: MessageInterface,
	map: Function
};
// Export functions
export class Client extends EventEmitter {
	options: {
		clientType: string
	};
	io: SocketIOClient.Socket;
	users: Map<string, Object> = new Map();
	messages: Map<string, Object> = new Map();
	privileged: Array<number> = [];
	token: string;
	channel: string;
	emotes: Array<any> = [];
	me: UserInterface = null;
	rest: any;
	constructor(options = {clientType: 'bot'}) {
		// Call parent class constructor
		super();

		this.options = options;

		// API
		this.rest = new Rest();

		// Websocket
		this.io = io(`https://chat.guac.live/`, {
			transports: ['websocket']
		});
	}

	async fetchEmotes(channel: string){
		await fetch('https://emotes.guac.live/index.json')
		.then(async response => {
			const data = await response.json();
			
			for(const emoteList of (<any>Object).values(data)){
				if(emoteList && (emoteList.default || emoteList.directory === channel)){
					await fetch(`https://emotes.guac.live/${emoteList.directory}/index.json`)
					.then(async response => {
						const data = await response.json();
						for(const emote of (<any>Object).values(data)){
							let url = emoteList.directory !== 'twitch' ? `//emotes.guac.live/${emoteList.directory}/${emote.id}.png` : `//static-cdn.jtvnw.net/emoticons/v1/${emote.id}/3.0`
							this.emotes[emote.code] = {
								provider: emoteList.name,
								url,
							};
						}
					})
					.catch(() => {});
				}
			}
		})
		.catch(() => {});	
	}

	async say(msg: string) {
		if (!msg) return;
		let split = msg && msg.split(' ');
		let msgs: MessagesInterface = split.map((content) => {
			return {
				type: Object.keys(this.emotes).indexOf(content) > -1 ? 'emote' : 'text',
				content: content,
				author: this.users.get(this.me.id)
			};
		});
		this.io.emit('message', msgs);
	}

	async connect(token: string, channel: string) {
		// Set the token in the instance
		if (this.options.clientType === 'bot') this.token = `Bot ${token}`
		else this.token = token;
		this.channel = channel;

		// Init REST API
		this.rest.init(this);

		// Fetch emotes
		await this.fetchEmotes(this.channel);

		// Connect to the socket
		this.io.connect();

		// Auth with the socket
		this.io.emit('join', this.token, this.channel);

		// Events
		this.io.on('me', (user: UserInterface) => {
			this.me = user;
		});
		this.io.on('join', (user: UserInterface) => {
			this.users.set(user.id, user);
			this.emit('join', this.users.get(user.id));
		});
		this.io.on('leave', (user: UserInterface) => {
			this.users.delete(user.id);
			this.emit('leave', user);
		});
		this.io.on('msgs', (user: UserInterface, id: number, messages: MessagesInterface) => {
			let msgs = messages.map((msg: MessageInterface) => {
				return {
					time: new Date(user.lastMessage),
					type: msg.type,
					content: msg.content,
					author: this.users.get(user.id)
				};
			});
			this.messages.set(id.toString(), msgs);
			return this.emit('message', this.messages.get(id.toString()));
		});
		this.io.on('users', (users: Array<UserInterface>) => {
			users.forEach((user: UserInterface) => {
				this.users.set(user.id, user);
			});
			this.emit('users', this.users);
		});
		this.io.on('sys', (msg: string) => {
			console.info('Server returned info:', msg);
			this.emit('sys', msg);
		});
		this.io.on('privileged', (priv: Array<number>) => {
			priv.forEach((uid: Number) => {
				if (typeof uid === 'number') {
					this.privileged.push(uid);
				}
			});
			this.emit('privileged', this.privileged);
		});
		//this.io.on('viewers', handleViewers);
		//this.io.on('delete', handleDelete);
	}
}