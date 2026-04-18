# Trading App - Screens & Theme Documentation

## 📱 App Screens

### Onboarding
| Screen | Use Case | Components/Features |
|--------|----------|---------------------|
| `/onboarding/welcome` | First-time user introduction with feature highlights | Onboarding carousel with 3 slides, pagination dots, Skip button, Get Started CTA |

### Authentication
| Screen | Use Case | Components/Features |
|--------|----------|---------------------|
| `/(auth)/sign-in` | User login | Email input, Password input, Sign In button, Sign Up link, Forgot password |
| `/(auth)/sign-up` | New user registration | Email input, Password creation, Confirm password, Sign Up button, Terms agreement |
| `/(auth)/verify-email` | Email verification | Verification code input, Resend code, Continue button |
| `/(auth)/SignOutButton` | Sign out action | Sign out confirmation button |

### Main Navigation (Drawer + Tabs)
| Screen | Use Case | Components/Features |
|--------|----------|---------------------|
| `/(drawer)/(tabs)/index` | Home dashboard | Market overview, Portfolio summary, Quick actions, Watchlist preview |
| `/(drawer)/(tabs)/markets` | Browse all markets | Asset search, Category filters, Price charts, Asset cards |
| `/(drawer)/(tabs)/trade` | Quick trading interface | Asset selector, Buy/Sell toggle, Order type, Amount input, Place order button |
| `/(drawer)/(tabs)/news` | Market news & updates | News feed, Article cards, Category filters, Bookmark option |
| `/(drawer)/(tabs)/profile` | User profile | Profile picture, Account info, Settings shortcuts, Referral code |

### Dashboard
| Screen | Use Case | Components/Features |
|--------|----------|---------------------|
| `/dashboard` | Demo account dashboard | Demo wallet balance, P&L display, Cash available, Refresh indicator, Place demo trade button, View holdings button |

### Portfolio
| Screen | Use Case | Components/Features |
|--------|----------|---------------------|
| `/portfolio/detail` | Detailed portfolio view | Holdings list, Asset allocation chart, Total value, P&L breakdown, Performance metrics |

### Orders
| Screen | Use Case | Components/Features |
|--------|----------|---------------------|
| `/orders/order-form` | Place buy/sell orders | Asset search, Order type selector (Market/Limit/Stop), Quantity input, Price input, Order preview, Submit button |
| `/orders/history` | View order history | Order list, Status filters, Date range, Order details expandable |

### Wallets
| Screen | Use Case | Components/Features |
|--------|----------|---------------------|
| `/wallets/balances` | View wallet balances | Balance cards, Currency breakdown, Available vs. Total |
| `/wallets/deposit` | Fund account | Deposit method selection, Amount input, Bank connection, Instructions |
| `/wallets/deposit-success` | Deposit confirmation | Success animation, Transaction details, Continue button |
| `/wallets/withdraw` | Withdraw funds | Withdrawal method, Amount input, Bank selection, Confirmation |
| `/wallets/linked-banks` | Manage bank accounts | Bank list, Add new bank, Set default, Remove bank |

### Settings
| Screen | Use Case | Components/Features |
|--------|----------|---------------------|
| `/settings/index` | Main settings menu | Settings categories list, Account, Security, Notifications, Support links |
| `/settings/account` | Account management | Profile info, Personal details, Account preferences, Delete account |
| `/settings/security` | Security settings | Password change, 2FA toggle, Biometric login, Session management |
| `/settings/notifications` | Notification preferences | Push notifications toggle, Email alerts, Price alerts, News alerts |
| `/settings/invite` | Invite friends | Referral code share, Invite link, Contacts import, Reward info |
| `/settings/referral-history` | Referral tracking | Referred users list, Rewards earned, Status tracking |
| `/settings/support` | Help & support | FAQ, Contact support, Live chat option, Documentation links |

### KYC (Know Your Customer)
| Screen | Use Case | Components/Features |
|--------|----------|---------------------|
| `/kyc/start` | Begin identity verification | KYC intro, Requirements list, Start button, Document type selection |
| `/kyc/document-capture` | Capture ID documents | Camera interface, Document framing guide, Upload from gallery, Retake option |
| `/kyc/face-match` | Biometric verification | Face capture, Liveness detection, Instructions overlay |
| `/kyc/status` | Verification status | Status indicator, Progress steps, Rejection reasons, Retry option |

### Alerts
| Screen | Use Case | Components/Features |
|--------|----------|---------------------|
| `/alerts/center` | Central alert hub | All notifications, Alert categories, Mark as read, Clear all |
| `/alerts/price-alerts` | Price-based alerts | Set price targets, Alert list, Enable/disable toggle, Push notification settings |
| `/alerts/ai-insights` | AI-generated alerts | Smart insights, Market predictions, Trend alerts, Actionable recommendations |

### Search
| Screen | Use Case | Components/Features |
|--------|----------|---------------------|
| `/search/market` | Search assets | Search bar, Recent searches, Trending assets, Category filters, Results list |

### Miscellaneous
| Screen | Use Case | Components/Features |
|--------|----------|---------------------|
| `/misc/asset-detail` | Detailed asset view | Price chart, Asset info, Stats, Buy/Sell buttons, Related assets, News |
| `/misc/watchlist` | Manage watchlist | Watchlist items, Add/remove assets, Reorder, Quick view |
| `/misc/transactions` | Transaction history | Transaction list, Filters, Date range, Export option, Details modal |
| `/misc/trade-confirm` | Trade confirmation | Order summary, Final confirmation, Success/Failure state, Receipt |
| `/misc/legal` | Legal documents | Terms of service, Privacy policy, Disclosures, Version info |
| `/misc/maintenance` | App maintenance | Maintenance message, Estimated time, Retry button |

### System Screens
| Screen | Use Case | Components/Features |
|--------|----------|---------------------|
| `+not-found` | 404 error page | Error message, Back to home button |
| `_layout` | Root layout wrapper | Navigation container, Theme provider, Global styles |

---

## 🎨 Color Theme

### Dark Theme (Primary)

#### Background Colors
| Token | Hex Code | Usage |
|-------|----------|-------|
| `background.primary` | `#050A05` | Main app background |
| `background.secondary` | `#001C10` | Secondary surfaces, cards |
| `background.tertiary` | `#003C24` | Elevated surfaces, highlights |
| `background.accent` | `#00D35A` | Accent backgrounds |

#### Surface Colors
| Token | Hex Code | Usage |
|-------|----------|-------|
| `surface.primary` | `rgba(0, 0, 0, 0.4)` | Card backgrounds |
| `surface.secondary` | `rgba(0, 0, 0, 0.6)` | Overlays, modals |
| `surface.elevated` | `rgba(0, 28, 16, 0.8)` | Elevated cards, menus |
| `surface.glass` | `rgba(0, 211, 90, 0.08)` | Glassmorphism effects |

#### Text Colors
| Token | Hex Code | Usage |
|-------|----------|-------|
| `text.primary` | `#E6F8EA` | Primary text, headings |
| `text.secondary` | `#A8D5B3` | Secondary text, descriptions |
| `text.tertiary` | `#6B9175` | Tertiary text, labels, hints |
| `text.disabled` | `#4A5F4E` | Disabled text |
| `text.inverse` | `#0F1724` | Text on light/accent backgrounds |

#### Accent Colors
| Token | Hex Code | Usage |
|-------|----------|-------|
| `accent.primary` | `#00D35A` | Primary brand color, CTAs |
| `accent.secondary` | `#00FF6B` | Hover states, highlights |
| `accent.tertiary` | `#00A347` | Darker accents, pressed states |
| `accent.glow` | `rgba(0, 211, 90, 0.3)` | Glow effects, shadows |

#### Semantic Colors
| Token | Hex Code | Usage |
|-------|----------|-------|
| `success` | `#00D35A` | Success states, positive values |
| `error` | `#FF3B30` | Error states, negative values, alerts |
| `warning` | `#FFD60A` | Warnings, cautions |
| `info` | `#0A84FF` | Informational elements |

#### Chart Colors
| Token | Hex Code | Usage |
|-------|----------|-------|
| `chart.bullish` | `#00D35A` | Upward trends, gains |
| `chart.bearish` | `#FF3B30` | Downward trends, losses |
| `chart.neutral` | `#8E8E93` | Neutral states |
| `chart.grid` | `rgba(230, 248, 234, 0.1)` | Chart grid lines |

### Light Theme

#### Background Colors
| Token | Hex Code | Usage |
|-------|----------|-------|
| `background.primary` | `#FFFFFF` | Main app background |
| `background.secondary` | `#E9FFF1` | Secondary surfaces |
| `background.tertiary` | `#B9FFD2` | Tertiary surfaces |
| `background.accent` | `#00D35A` | Accent backgrounds |

#### Surface Colors
| Token | Hex Code | Usage |
|-------|----------|-------|
| `surface.primary` | `rgba(255, 255, 255, 0.95)` | Card backgrounds |
| `surface.secondary` | `rgba(233, 255, 241, 0.8)` | Secondary surfaces |
| `surface.elevated` | `rgba(185, 255, 210, 0.6)` | Elevated elements |
| `surface.glass` | `rgba(0, 211, 90, 0.05)` | Glass effects |

#### Text Colors
| Token | Hex Code | Usage |
|-------|----------|-------|
| `text.primary` | `#0F1724` | Primary text |
| `text.secondary` | `#3A4556` | Secondary text |
| `text.tertiary` | `#6B7684` | Tertiary text |
| `text.disabled` | `#A8ADB7` | Disabled text |
| `text.inverse` | `#FFFFFF` | Text on dark/accent backgrounds |

#### Accent Colors (Same as Dark)
| Token | Hex Code | Usage |
|-------|----------|-------|
| `accent.primary` | `#00D35A` | Primary brand color |
| `accent.secondary` | `#00A347` | Secondary accent |
| `accent.tertiary` | `#007A35` | Darker accent |
| `accent.glow` | `rgba(0, 211, 90, 0.2)` | Glow effects |

#### Semantic Colors (Light)
| Token | Hex Code | Usage |
|-------|----------|-------|
| `success` | `#00D35A` | Success states |
| `error` | `#FF3B30` | Error states |
| `warning` | `#FF9500` | Warnings (orange variant) |
| `info` | `#007AFF` | Informational (blue variant) |

#### Chart Colors (Light)
| Token | Hex Code | Usage |
|-------|----------|-------|
| `chart.bullish` | `#00D35A` | Upward trends |
| `chart.bearish` | `#FF3B30` | Downward trends |
| `chart.neutral` | `#8E8E93` | Neutral states |
| `chart.grid` | `rgba(15, 23, 36, 0.08)` | Chart grid lines |

---

## 🎨 Gradient Themes

### Dark Theme Gradient
```
Black → Green gradient
#050A05 → #001C10 → #003C24 → #00D35A
```

### Light Theme Gradient
```
White → Mint gradient
#FFFFFF → #E9FFF1 → #B9FFD2
```
