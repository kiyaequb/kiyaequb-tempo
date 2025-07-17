// new_website/lib/helpers.js (or common location)
import bcryptjs from "bcryptjs";

export function validatePhoneNumber(phoneNumber) {
  if (typeof phoneNumber !== "string") {
    throw new Error("Phone number must be a string.");
  }
  phoneNumber = phoneNumber.replace(/\s/g, "");
  if (phoneNumber.startsWith("+")) phoneNumber = phoneNumber.slice(1);
  if (phoneNumber.startsWith("251")) phoneNumber = phoneNumber.slice(3);
  else if (phoneNumber.startsWith("0")) phoneNumber = phoneNumber.slice(1);
  else throw new Error("Invalid phone number format (must start with 0 or 251).");
  if (!/^\d+$/.test(phoneNumber)) throw new Error("Invalid phone number format (digits only).");
  phoneNumber = Number(phoneNumber).toString(); // Remove leading zeros
  if (!((phoneNumber.startsWith("9") && phoneNumber.length === 9) || (phoneNumber.startsWith("7") && phoneNumber.length === 9))) {
    throw new Error("Invalid phone number format (9xxxxxxx or 7xxxxxxx).");
  }
  return "+251" + phoneNumber;
}

export async function hashPassword(password) {
  return bcryptjs.hash(password, 10);
}

// Placeholder for fetching from original API. Replace with actual fetch implementation.
export async function callOriginalApi(endpoint, method = 'GET', body = null) {
  console.log("test: 123");
  const ORIGINAL_API_BASE_URL = "https://kiyaequb.com/api";
  // const ORIGINAL_API_BASE_URL = 'http://localhost:3001/api'; // if local testing  // Your original API base URL
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    try {
        const response = await fetch(`${ORIGINAL_API_BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Failed to call original API, non-JSON response" }));
            console.error(`Original API Error (${endpoint}): ${response.status}`, errorData);
            throw new Error(errorData.error || `Original API request failed with status ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error(`Error calling Original API (${endpoint}):`, error);
        throw error; // Re-throw to be caught by the calling API route
    }
}