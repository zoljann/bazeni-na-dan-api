# Bazeni na dan API

Backend for the Bazeni na dan web application, built with TypeScript and Node.js (Express), providing all core functionality needed by the frontend. It exposes REST endpoints for managing users and pool owners, pool listings, availability calendars, and booking requests. MongoDB (via Mongoose) is used for persistence, while middleware handles authentication/authorization (JWT-based), validation, and file uploads for pool images. The API is designed to support features such as searching pools by city and date, filtering by amenities (heated, pets allowed, etc.), managing and handling owner workflows for creating and updating listings. Frontend/UI part is on [this repository](https://github.com/zoljann/bazeni-na-dan).

### Preview/demo

- YouTube mobile view video: https://www.youtube.com/shorts/nlvEJ-oBi1o
- Live app: `https://bazeni-na-dan.com`

### Getting Started

To get started with the project, follow these steps:

1. Install dependencies:
   - `npm install`
2. Start the development server:
   - `npm run dev`
3. Create a production build:
   - `npm run build`
