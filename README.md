# VivaApp

A modern food pass application with QR code scanning, admin dashboard, and attendee management.

## Features

- 🍕 **Food Item Management**: Browse and search food items
- 📱 **QR Code Scanning**: Scan QR codes to redeem offers
- 👥 **Attendee Management**: Add and manage attendees
- 🔐 **Admin Dashboard**: Secure admin interface with role-based access
- 📊 **Real-time Updates**: Live data synchronization with Firebase
- 🎫 **QR Code Generation**: Generate QR codes for events and offers
- 📈 **Analytics Dashboard**: Track redemptions and usage statistics
- 🔄 **CSV Import/Export**: Bulk import attendees and export data
- 🌙 **Dark Mode Support**: Toggle between light and dark themes
- 📱 **Mobile Responsive**: Optimized for mobile and desktop use

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Firebase (Firestore, Authentication)
- **QR Scanning**: @yudiel/react-qr-scanner
- **QR Generation**: qrcode library
- **Package Manager**: pnpm
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Firebase project

### Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd VivaApp
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Set up environment variables**:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Firebase configuration:

   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

4. **Run the development server**:

   ```bash
   pnpm dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Firebase Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication with Google provider
4. Create a Firestore database

### 2. Get Firebase Configuration

1. Go to Project Settings
2. Scroll down to "Your apps"
3. Click the web icon (</>)
4. Register your app and copy the config

### 3. Set Up Firestore Collections

The app uses the following collections:

- `admins`: Admin user records
- `attendees`: Attendee information
- `redemptions`: QR code redemption records
- `foodItems`: Food item catalog
- `events`: Event information

### 4. Set Up Admin Users

See [ADMIN_SETUP.md](./ADMIN_SETUP.md) for detailed instructions on setting up admin users.

## Deployment

### Vercel (Recommended)

1. **Connect your repository**:

   - Push your code to GitHub
   - Connect your repository to Vercel

2. **Configure environment variables**:

   - Add all Firebase environment variables in Vercel dashboard
   - Set `NODE_ENV=production`

3. **Deploy**:
   ```bash
   vercel --prod
   ```

### Other Platforms

The app can be deployed to any platform that supports Next.js:

- **Netlify**: Use the Next.js build command
- **Railway**: Connect your GitHub repository
- **DigitalOcean App Platform**: Deploy with automatic builds

## Project Structure

```
VivaApp/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin dashboard pages
│   │   ├── manage-admins/ # Admin management
│   │   └── residents/     # Resident management
│   ├── api/               # API routes
│   │   ├── berlinhouse/   # Berlin House API
│   │   └── luma/          # Lu.ma API integration
│   ├── pos/               # Point of Sale interface
│   ├── redeem/            # QR redemption page
│   ├── scan/              # QR scanning page
│   └── page.tsx           # Main app page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── admin-guard.tsx   # Admin route protection
│   ├── qr-scanner.tsx    # QR code scanner
│   ├── qr-generator.tsx  # QR code generator
│   └── ...               # Other custom components
├── lib/                  # Utility libraries
│   ├── firebase.ts       # Firebase configuration
│   ├── admin.ts          # Admin utilities
│   └── accesspass.ts     # Access pass utilities
├── hooks/                # Custom React hooks
├── scripts/              # Utility scripts
└── public/               # Static assets
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `node scripts/add-admin.js` - Add admin users (see ADMIN_SETUP.md)
- `node scripts/add-meal-entitlements.js` - Add Drinksentitlements
- `node scripts/create-admin.js` - Create new admin user

## API Routes

### `/api/berlinhouse`

- **GET**: Fetch Berlin House data
- **POST**: Update Berlin House information

### `/api/luma`

- **GET**: Fetch Lu.ma event data
- **POST**: Process Lu.ma check-ins

## Environment Variables

| Variable                                   | Description                  | Required |
| ------------------------------------------ | ---------------------------- | -------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Firebase API key             | ✅       |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Firebase auth domain         | ✅       |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Firebase project ID          | ✅       |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Firebase storage bucket      | ✅       |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | ✅       |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | Firebase app ID              | ✅       |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`      | Firebase measurement ID      | ✅       |

## Troubleshooting

### Common Issues

1. **QR Scanner not working on mobile**:

   - Ensure HTTPS is enabled (required for camera access)
   - Check browser permissions for camera access
   - Try refreshing the page

2. **Firebase connection issues**:

   - Verify all environment variables are set correctly
   - Check Firebase project settings
   - Ensure Firestore rules allow read/write access

3. **Admin access denied**:

   - Verify admin user is properly set up in Firebase
   - Check admin email is correct in the database
   - Run the admin setup script if needed

4. **Build errors**:
   - Clear node_modules and reinstall: `rm -rf node_modules pnpm-lock.yaml && pnpm install`
   - Check TypeScript errors: `pnpm lint`
   - Verify all dependencies are compatible

### Performance Optimization

- Enable Firebase offline persistence for better performance
- Use image optimization for QR codes
- Implement proper caching strategies
- Monitor bundle size with `pnpm build --analyze`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use conventional commit messages
- Add proper error handling
- Include loading states for better UX
- Test on both mobile and desktop

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:

- Create an issue in the GitHub repository
- Check the [ADMIN_SETUP.md](./ADMIN_SETUP.md) for admin-related questions
- Review the troubleshooting section above

## Changelog

### v1.0.0

- Initial release with QR scanning and admin dashboard
- Firebase integration
- Basic attendee management

### v1.1.0

- Added Lu.ma integration
- Enhanced admin interface
- Improved mobile responsiveness
- Added dark mode support
