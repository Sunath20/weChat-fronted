import { fileHandler } from "./fileHandler.js";
import { apiHandler } from "./requestHandling.js";

const USER_PUBLIC_KEY_TAG = "user_public_key"
const USER_PRIVATE_KEY_TAG = "user_private_key"

class CryptoHandler {

    // Generate ECDH key pair
    async generateKeyPair(){
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: "P-256" // industry standard curve
            },
            true, // extractable - so we can export and store
            ["deriveKey"] // usage
        );
        return keyPair; // { privateKey, publicKey }
    }

    // Export public key to send to server (JSON Web Key format)
    async exportPublicKey(publicKey){
        const exported = await window.crypto.subtle.exportKey("jwk", publicKey);
        return exported; // plain object, safe to send to server
    }

    // Export private key to encrypt and store
    async exportPrivateKey(privateKey){
        const exported = await window.crypto.subtle.exportKey("jwk", privateKey);
        return exported; // plain object, encrypt before storing!
    }

    // Import public key from server (JWK format back to CryptoKey)
    async importPublicKey(jwk){
        const publicKey = await window.crypto.subtle.importKey(
            "jwk",
            jwk,
            {
                name: "ECDH",
                namedCurve: "P-256"
            },
            true,
            [] // public key has no usage — only used in deriveKey with private key
        );
        return publicKey;
    }

    // Import private key from IndexedDB
    async importPrivateKey(jwk){
        const privateKey = await window.crypto.subtle.importKey(
            "jwk",
            jwk,
            {
                name: "ECDH",
                namedCurve: "P-256"
            },
            true,
            ["deriveKey"]
        );
        return privateKey;
    }

  async init(){
    const userDetails = JSON.parse(localStorage.getItem('userDetails'));
    const userID = userDetails.contact;
    
    const user_public_key = await fileHandler.readSecurityKey(USER_PUBLIC_KEY_TAG);
    const user_private_key = await fileHandler.readSecurityKey(USER_PRIVATE_KEY_TAG);

    if(!user_private_key || !user_public_key){
        const pair = await this.generateKeyPair();
        
        this.publicKey = pair.publicKey;
        this.privateKey = pair.privateKey;

        const savingPublicKey = await this.exportPublicKey(pair.publicKey);
        const savingPrivateKey = await this.exportPrivateKey(pair.privateKey);

        await fileHandler.saveSecurityKey(USER_PUBLIC_KEY_TAG, savingPublicKey);
        await fileHandler.saveSecurityKey(USER_PRIVATE_KEY_TAG, savingPrivateKey);
        await apiHandler.savePublicKey(userID, savingPublicKey); 
    }else{
        this.publicKey = await this.importPublicKey(user_public_key.key);
        this.privateKey = await this.importPrivateKey(user_private_key.key);
    }
}

    getPublicKey(){
        return this.publicKey;
    }

    getPrivateKey(){
        return this.privateKey;
    }



    async loadFriendKey(userID){
    // check IndexedDB first
    const cached = await fileHandler.readSecurityKey(`contact_${userID}`);
    if(cached){
        return await this.importPublicKey(cached.key);
    }

    // not in cache, fetch from server
    const response = await apiHandler.getPublicKey(userID);
    if(!response.ok){
        console.error("Failed to fetch public key for", userID);
        return null;
    }

    const data = await response.json();
    const jwk = JSON.parse(data.keydata); // ✅ parse the stored JSON string back to JWK

    // save to IndexedDB for next time
    await fileHandler.saveSecurityKey(`contact_${userID}`, jwk);

    return await this.importPublicKey(jwk);
}


    async deriveSharedKey(friendPublicKey){
        const sharedKey = await window.crypto.subtle.deriveKey(
            {
                name: "ECDH",
                public: friendPublicKey
            },
            this.privateKey,
            {
                name: "AES-GCM",
                length: 256
            },
            false,
            ["encrypt", "decrypt"]
        );
        return sharedKey;
    }

    async encryptMessage(message, friendPublicKey){
        const sharedKey = await this.deriveSharedKey(friendPublicKey);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encodedMessage = new TextEncoder().encode(message);

        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            sharedKey,
            encodedMessage
        );

        const ivString = btoa(String.fromCharCode(...iv));
        const dataString = btoa(String.fromCharCode(...new Uint8Array(encrypted)));

        return {
            iv: ivString,
            data: dataString
        };
    }

    async decryptMessage(encryptedPayload, friendPublicKey){
        const sharedKey = await this.deriveSharedKey(friendPublicKey);

        const iv = new Uint8Array(atob(encryptedPayload.iv).split('').map(c => c.charCodeAt(0)));
        const data = new Uint8Array(atob(encryptedPayload.data).split('').map(c => c.charCodeAt(0)));

        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            sharedKey,
            data
        );

        return new TextDecoder().decode(decrypted);
    }



}

export const cryptoHandler = new CryptoHandler()