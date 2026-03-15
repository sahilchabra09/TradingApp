/**
 * Admin Routes
 * Handles admin dashboard operations: user listing, KYC management
 * Protected by requireAuth + requireAdmin middleware
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db';
import { users, kycSessions, auditLogs } from '../db/schema';
import { eq, desc, ilike, or, sql, and, isNull, count } from 'drizzle-orm';
// Auth disabled for POC — re-enable for production
// import { requireAuth, requireAdmin } from '../middleware/clerk-auth';
import { DiditService } from '../services/didit.service';

const admin = new Hono();

// POC: auth middleware disabled
// admin.use('*', requireAuth, requireAdmin);

// ============================================================================
// Dashboard Stats
// ============================================================================

admin.get('/stats', async (c) => {
	const [totalUsersResult] = await db.select({ count: count() }).from(users).where(isNull(users.deletedAt));
	const [verifiedResult] = await db.select({ count: count() }).from(users).where(and(eq(users.kycStatus, 'approved'), isNull(users.deletedAt)));
	const [pendingKycResult] = await db.select({ count: count() }).from(users).where(and(eq(users.kycStatus, 'pending'), isNull(users.deletedAt)));
	const [activeResult] = await db.select({ count: count() }).from(users).where(and(eq(users.accountStatus, 'active'), isNull(users.deletedAt)));

	return c.json({
		success: true,
		data: {
			totalUsers: totalUsersResult?.count ?? 0,
			verifiedUsers: verifiedResult?.count ?? 0,
			pendingKYC: pendingKycResult?.count ?? 0,
			activeUsers: activeResult?.count ?? 0,
		},
	});
});

// ============================================================================
// Users - List, Get, Suspend, Ban, Activate
// ============================================================================

const listUsersSchema = z.object({
	page: z.coerce.number().min(1).default(1),
	pageSize: z.coerce.number().min(1).max(100).default(10),
	search: z.string().optional(),
	kycStatus: z.string().optional(),
	accountStatus: z.string().optional(),
});

admin.get('/users', zValidator('query', listUsersSchema), async (c) => {
	const { page, pageSize, search, kycStatus, accountStatus } = c.req.valid('query');
	const offset = (page - 1) * pageSize;

	// Build conditions
	const conditions = [isNull(users.deletedAt)];

	if (search) {
		conditions.push(
			or(
				ilike(users.email, `%${search}%`),
				ilike(users.firstName, `%${search}%`),
				ilike(users.lastName, `%${search}%`)
			)!
		);
	}

	if (kycStatus && kycStatus !== 'all') {
		conditions.push(eq(users.kycStatus, kycStatus as any));
	}

	if (accountStatus && accountStatus !== 'all') {
		conditions.push(eq(users.accountStatus, accountStatus as any));
	}

	const whereClause = and(...conditions);

	const [totalResult] = await db.select({ count: count() }).from(users).where(whereClause);
	const total = totalResult?.count ?? 0;

	const userList = await db.query.users.findMany({
		where: whereClause,
		orderBy: [desc(users.createdAt)],
		limit: pageSize,
		offset,
	});

	// Map to safe admin view (include more fields than public but exclude secrets)
	const data = userList.map((u) => ({
		id: u.id,
		clerkId: u.clerkId,
		email: u.email,
		firstName: u.firstName,
		lastName: u.lastName,
		phoneNumber: u.phoneNumber,
		dateOfBirth: u.dateOfBirth,
		nationality: u.nationality,
		residentialAddress: u.residentialAddress,
		accountStatus: u.accountStatus,
		kycStatus: u.kycStatus,
		riskProfile: u.riskProfile,
		emailVerified: u.emailVerified,
		phoneVerified: u.phoneVerified,
		twoFactorEnabled: u.twoFactorEnabled,
		isAdmin: u.isAdmin,
		lastLoginAt: u.lastLoginAt,
		createdAt: u.createdAt,
		updatedAt: u.updatedAt,
	}));

	return c.json({
		success: true,
		data: {
			data,
			pagination: {
				page,
				pageSize,
				total,
				totalPages: Math.ceil(total / pageSize),
			},
		},
	});
});

admin.get('/users/:id', async (c) => {
	const { id } = c.req.param();

	const user = await db.query.users.findFirst({
		where: eq(users.id, id),
		with: {
			wallets: true,
			holdings: true,
		},
	});

	if (!user) {
		return c.json({ success: false, error: 'User not found' }, 404);
	}

	return c.json({
		success: true,
		data: {
			id: user.id,
			clerkId: user.clerkId,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			phoneNumber: user.phoneNumber,
			dateOfBirth: user.dateOfBirth,
			nationality: user.nationality,
			residentialAddress: user.residentialAddress,
			accountStatus: user.accountStatus,
			kycStatus: user.kycStatus,
			riskProfile: user.riskProfile,
			emailVerified: user.emailVerified,
			phoneVerified: user.phoneVerified,
			twoFactorEnabled: user.twoFactorEnabled,
			isAdmin: user.isAdmin,
			lastLoginAt: user.lastLoginAt,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
			wallets: user.wallets,
			holdings: user.holdings,
		},
	});
});

admin.post('/users/:id/suspend', async (c) => {
	const { id } = c.req.param();
	const adminUser = { id: 'poc-admin' }; // POC: no auth

	const [updated] = await db
		.update(users)
		.set({ accountStatus: 'suspended', updatedAt: new Date() })
		.where(eq(users.id, id))
		.returning();

	if (!updated) {
		return c.json({ success: false, error: 'User not found' }, 404);
	}

	await db.insert(auditLogs).values({
		adminId: adminUser.id,
		eventType: 'user_suspended',
		eventCategory: 'admin_action',
		description: `Admin suspended user ${id}`,
		metadata: { targetUserId: id },
		severity: 'warning',
	});

	return c.json({ success: true, message: 'User suspended' });
});

admin.post('/users/:id/ban', async (c) => {
	const { id } = c.req.param();
	const adminUser = { id: 'poc-admin' }; // POC: no auth

	const [updated] = await db
		.update(users)
		.set({ accountStatus: 'closed', updatedAt: new Date() })
		.where(eq(users.id, id))
		.returning();

	if (!updated) {
		return c.json({ success: false, error: 'User not found' }, 404);
	}

	await db.insert(auditLogs).values({
		adminId: adminUser.id,
		eventType: 'user_banned',
		eventCategory: 'admin_action',
		description: `Admin banned user ${id}`,
		metadata: { targetUserId: id },
		severity: 'warning',
	});

	return c.json({ success: true, message: 'User banned' });
});

admin.post('/users/:id/activate', async (c) => {
	const { id } = c.req.param();
	const adminUser = { id: 'poc-admin' }; // POC: no auth

	const [updated] = await db
		.update(users)
		.set({ accountStatus: 'active', updatedAt: new Date() })
		.where(eq(users.id, id))
		.returning();

	if (!updated) {
		return c.json({ success: false, error: 'User not found' }, 404);
	}

	await db.insert(auditLogs).values({
		adminId: adminUser.id,
		eventType: 'user_activated',
		eventCategory: 'admin_action',
		description: `Admin activated user ${id}`,
		metadata: { targetUserId: id },
		severity: 'info',
	});

	return c.json({ success: true, message: 'User activated' });
});

// ============================================================================
// KYC - List sessions, Get details, Approve, Reject
// ============================================================================

const listKycSchema = z.object({
	page: z.coerce.number().min(1).default(1),
	pageSize: z.coerce.number().min(1).max(100).default(10),
	status: z.string().optional(),
});

admin.get('/kyc', zValidator('query', listKycSchema), async (c) => {
	const { page, pageSize, status } = c.req.valid('query');
	const offset = (page - 1) * pageSize;

	const conditions = [];
	if (status && status !== 'all') {
		conditions.push(eq(kycSessions.status, status as any));
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const [totalResult] = await db.select({ count: count() }).from(kycSessions).where(whereClause);
	const total = totalResult?.count ?? 0;

	const sessions = await db.query.kycSessions.findMany({
		where: whereClause,
		with: {
			user: true,
		},
		orderBy: [desc(kycSessions.createdAt)],
		limit: pageSize,
		offset,
	});

	const data = sessions.map((s) => ({
		id: s.id,
		userId: s.userId,
		diditSessionId: s.diditSessionId,
		status: s.status,
		adminApprovalStatus: s.adminApprovalStatus,
		createdAt: s.createdAt,
		updatedAt: s.updatedAt,
		userName: s.user ? `${s.user.firstName} ${s.user.lastName}` : 'Unknown',
		userEmail: s.user?.email ?? 'Unknown',
	}));

	return c.json({
		success: true,
		data: {
			data,
			pagination: {
				page,
				pageSize,
				total,
				totalPages: Math.ceil(total / pageSize),
			},
		},
	});
});

admin.get('/kyc/:sessionId', async (c) => {
	const { sessionId } = c.req.param();

	const session = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.id, sessionId),
		with: { user: true },
	});

	if (!session) {
		return c.json({ success: false, error: 'KYC session not found' }, 404);
	}

	// Read verification data from DB (stored by webhook)
	const diditDecision = session.verificationData as any;

	const verificationDetails = diditDecision ? {
		documentVerified: diditDecision.id_verification?.status === 'Approved',
		livenessVerified: diditDecision.liveness?.status === 'Approved',
		faceMatchVerified: diditDecision.face_match?.status === 'Approved',
		documentType: diditDecision.id_verification?.document_type,
		documentNumber: diditDecision.id_verification?.document_number,
		fullName: diditDecision.id_verification?.full_name,
		firstName: diditDecision.id_verification?.first_name,
		lastName: diditDecision.id_verification?.last_name,
		dateOfBirth: diditDecision.id_verification?.date_of_birth,
		age: diditDecision.id_verification?.age,
		gender: diditDecision.id_verification?.gender,
		nationality: diditDecision.id_verification?.nationality,
		issuingState: diditDecision.id_verification?.issuing_state_name,
		expirationDate: diditDecision.id_verification?.expiration_date,
		address: diditDecision.id_verification?.formatted_address || diditDecision.id_verification?.address,
		frontImage: diditDecision.id_verification?.front_image,
		backImage: diditDecision.id_verification?.back_image,
		portraitImage: diditDecision.id_verification?.portrait_image,
		selfieImage: diditDecision.liveness?.reference_image,
		livenessScore: diditDecision.liveness?.score,
		faceMatchScore: diditDecision.face_match?.score,
		faceMatchSourceImage: diditDecision.face_match?.source_image,
		faceMatchTargetImage: diditDecision.face_match?.target_image,
		ipCountry: diditDecision.ip_analysis?.ip_country,
		ipAddress: diditDecision.ip_analysis?.ip_address,
		isVpnOrTor: diditDecision.ip_analysis?.is_vpn_or_tor,
		deviceBrand: diditDecision.ip_analysis?.device_brand,
		deviceModel: diditDecision.ip_analysis?.device_model,
		amlStatus: diditDecision.aml?.status,
		amlHits: diditDecision.aml?.total_hits,
		warnings: [
			...(diditDecision.id_verification?.warnings || []),
			...(diditDecision.liveness?.warnings || []),
			...(diditDecision.face_match?.warnings || []),
		],
	} : null;

	return c.json({
		success: true,
		data: {
			id: session.id,
			userId: session.userId,
			diditSessionId: session.diditSessionId,
			status: session.status,
			adminApprovalStatus: session.adminApprovalStatus,
			adminReviewedAt: session.adminReviewedAt,
			adminReviewedBy: session.adminReviewedBy,
			adminRejectionReason: session.adminRejectionReason,
			createdAt: session.createdAt,
			updatedAt: session.updatedAt,
			userName: session.user ? `${session.user.firstName} ${session.user.lastName}` : 'Unknown',
			userEmail: session.user?.email ?? 'Unknown',
			verificationDetails,
		},
	});
});

admin.post('/kyc/:sessionId/approve', async (c) => {
	const { sessionId } = c.req.param();
	const adminUser = { id: 'poc-admin' }; // POC: no auth

	const session = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.id, sessionId),
	});

	if (!session) {
		return c.json({ success: false, error: 'KYC session not found' }, 404);
	}

	// Update session: admin approves
	await db.update(kycSessions).set({
		adminApprovalStatus: 'approved',
		adminReviewedAt: new Date(),
		adminReviewedBy: adminUser.id,
		updatedAt: new Date(),
	}).where(eq(kycSessions.id, sessionId));

	// Now activate user — admin has approved, user can trade
	await db.update(users).set({
		kycStatus: 'approved',
		accountStatus: 'active',
		updatedAt: new Date(),
	}).where(eq(users.id, session.userId));

	// Audit log
	await db.insert(auditLogs).values({
		adminId: adminUser.id,
		userId: session.userId,
		eventType: 'kyc_approved',
		eventCategory: 'admin_action',
		description: `Admin approved KYC for user ${session.userId}`,
		metadata: { targetUserId: session.userId, sessionId },
		severity: 'info',
	});

	return c.json({ success: true, message: 'KYC approved' });
});

const rejectKycSchema = z.object({
	reason: z.string().min(1, 'Rejection reason is required'),
});

admin.post('/kyc/:sessionId/reject', zValidator('json', rejectKycSchema), async (c) => {
	const { sessionId } = c.req.param();
	const { reason } = c.req.valid('json');
	const adminUser = { id: 'poc-admin' }; // POC: no auth

	const session = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.id, sessionId),
	});

	if (!session) {
		return c.json({ success: false, error: 'KYC session not found' }, 404);
	}

	// Update session: admin rejects
	await db.update(kycSessions).set({
		adminApprovalStatus: 'rejected',
		adminReviewedAt: new Date(),
		adminReviewedBy: adminUser.id,
		adminRejectionReason: reason,
		updatedAt: new Date(),
	}).where(eq(kycSessions.id, sessionId));

	// Update user KYC status
	await db.update(users).set({
		kycStatus: 'rejected',
		updatedAt: new Date(),
	}).where(eq(users.id, session.userId));

	// Audit log
	await db.insert(auditLogs).values({
		adminId: adminUser.id,
		userId: session.userId,
		eventType: 'kyc_rejected',
		eventCategory: 'admin_action',
		description: `Admin rejected KYC for user ${session.userId}: ${reason}`,
		metadata: { targetUserId: session.userId, sessionId, reason },
		severity: 'warning',
	});

	return c.json({ success: true, message: 'KYC rejected' });
});

export default admin;
