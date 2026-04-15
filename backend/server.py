from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import secrets
import httpx
from bson import ObjectId
import aiofiles
import base64

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent

# JWT Configuration
JWT_SECRET = os.environ.get("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Checkpoint Hub - Workflow Service Operations")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# ======================= MODELS =======================

class UserBase(BaseModel):
    email: EmailStr
    name: str
    
class UserCreate(UserBase):
    password: str
    
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    role: str
    tenant_id: Optional[str] = None
    language: str = "en"
    created_at: datetime
    
class TenantCreate(BaseModel):
    name: str
    industry: str = "general"
    description: Optional[str] = None
    
class Tenant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    tenant_id: str
    name: str
    industry: str
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    settings: Dict[str, Any] = {}

class CheckpointCreate(BaseModel):
    name: str
    name_es: Optional[str] = None
    description: Optional[str] = None
    description_es: Optional[str] = None
    order: int
    allowed_roles: List[str] = []
    
class Checkpoint(BaseModel):
    model_config = ConfigDict(extra="ignore")
    checkpoint_id: str
    tenant_id: str
    name: str
    name_es: Optional[str] = None
    description: Optional[str] = None
    description_es: Optional[str] = None
    order: int
    allowed_roles: List[str] = []
    is_active: bool = True
    created_at: datetime

class SubtaskCreate(BaseModel):
    name: str
    name_es: Optional[str] = None
    description: Optional[str] = None
    description_es: Optional[str] = None
    requires_evidence: bool = True
    evidence_type: str = "photo"  # photo, document, note, any
    
class Subtask(BaseModel):
    model_config = ConfigDict(extra="ignore")
    subtask_id: str
    checkpoint_id: str
    tenant_id: str
    name: str
    name_es: Optional[str] = None
    description: Optional[str] = None
    description_es: Optional[str] = None
    requires_evidence: bool = True
    evidence_type: str = "photo"
    order: int
    is_active: bool = True
    created_at: datetime

class ItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    item_type: str = "vehicle"
    metadata: Dict[str, Any] = {}
    
class Item(BaseModel):
    model_config = ConfigDict(extra="ignore")
    item_id: str
    tenant_id: str
    client_id: str
    name: str
    description: Optional[str] = None
    item_type: str
    current_checkpoint_id: Optional[str] = None
    status: str = "registered"  # registered, in_progress, completed
    metadata: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

class EvidenceCreate(BaseModel):
    evidence_type: str = "photo"  # photo, document, note
    tag: str = "during"  # before, during, after
    note: Optional[str] = None
    
class Evidence(BaseModel):
    model_config = ConfigDict(extra="ignore")
    evidence_id: str
    item_id: str
    subtask_id: str
    checkpoint_id: str
    tenant_id: str
    worker_id: str
    evidence_type: str
    tag: str
    file_url: Optional[str] = None
    file_data: Optional[str] = None  # Base64 for small files
    note: Optional[str] = None
    created_at: datetime

class TaskProgressUpdate(BaseModel):
    subtask_id: str
    status: str  # pending, in_progress, completed
    notes: Optional[str] = None

class RoleCreate(BaseModel):
    name: str
    name_es: Optional[str] = None
    permissions: List[str] = []
    allowed_checkpoints: List[str] = []

class Role(BaseModel):
    model_config = ConfigDict(extra="ignore")
    role_id: str
    tenant_id: str
    name: str
    name_es: Optional[str] = None
    permissions: List[str] = []
    allowed_checkpoints: List[str] = []
    is_system: bool = False
    created_at: datetime

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    log_id: str
    tenant_id: Optional[str] = None
    user_id: str
    action: str
    entity_type: str
    entity_id: str
    changes: Dict[str, Any] = {}
    timestamp: datetime

class QuoteRequest(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    item_name: str
    item_type: str = "vehicle"
    description: str
    tenant_id: Optional[str] = None

class ClientSignup(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[str] = None
    vehicle_color: Optional[str] = None
    notes: Optional[str] = None

class TenantSelfSignup(BaseModel):
    company_name: str
    industry: str = "general"
    admin_name: str
    admin_email: EmailStr
    admin_password: str
    language: str = "es"

class TechnicianAssignment(BaseModel):
    user_id: str
    checkpoint_ids: List[str]

# ======================= HELPERS =======================

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def get_jwt_secret() -> str:
    return JWT_SECRET

def create_access_token(user_id: str, email: str, role: str, tenant_id: Optional[str] = None) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "tenant_id": tenant_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_super_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return user

async def require_tenant_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Tenant Admin access required")
    return user

async def log_audit(tenant_id: Optional[str], user_id: str, action: str, entity_type: str, entity_id: str, changes: Dict = {}):
    log = {
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "tenant_id": tenant_id,
        "user_id": user_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "changes": changes,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.audit_logs.insert_one(log)

# ======================= AUTH ENDPOINTS =======================

@api_router.post("/auth/register")
async def register(user: UserCreate, response: Response):
    email = user.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password_hash = hash_password(user.password)
    
    user_doc = {
        "user_id": user_id,
        "email": email,
        "name": user.name,
        "password_hash": password_hash,
        "role": "client",
        "tenant_id": None,
        "language": "en",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    access_token = create_access_token(user_id, email, "client")
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    await log_audit(None, user_id, "register", "user", user_id)
    
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return user_doc

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response, request: Request):
    email = credentials.email.lower()
    identifier = f"{request.client.host}:{email}"
    
    # Check brute force
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        lockout_time = attempt.get("lockout_until")
        if lockout_time:
            if isinstance(lockout_time, str):
                lockout_time = datetime.fromisoformat(lockout_time)
            if lockout_time.tzinfo is None:
                lockout_time = lockout_time.replace(tzinfo=timezone.utc)
            if lockout_time > datetime.now(timezone.utc):
                raise HTTPException(status_code=429, detail="Too many failed attempts. Please try again later.")
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        # Increment failed attempts
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {
                "$inc": {"count": 1},
                "$set": {"lockout_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}
            },
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Clear failed attempts on success
    await db.login_attempts.delete_one({"identifier": identifier})
    
    access_token = create_access_token(user["user_id"], email, user["role"], user.get("tenant_id"))
    refresh_token = create_refresh_token(user["user_id"])
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    await log_audit(user.get("tenant_id"), user["user_id"], "login", "user", user["user_id"])
    
    user.pop("password_hash", None)
    return user

@api_router.post("/auth/logout")
async def logout(response: Response, request: Request):
    user = await get_current_user(request)
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    await log_audit(user.get("tenant_id"), user["user_id"], "logout", "user", user["user_id"])
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        access_token = create_access_token(user["user_id"], user["email"], user["role"], user.get("tenant_id"))
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# Google OAuth Session endpoint
@api_router.post("/auth/session")
async def process_oauth_session(request: Request, response: Response):
    data = await request.json()
    session_id = data.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get user data
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        oauth_data = resp.json()
    
    email = oauth_data["email"].lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user:
        # Create new user from OAuth
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": oauth_data.get("name", email.split("@")[0]),
            "picture": oauth_data.get("picture"),
            "role": "client",
            "tenant_id": None,
            "language": "en",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "oauth_provider": "google"
        }
        await db.users.insert_one(user)
        await log_audit(None, user_id, "oauth_register", "user", user_id)
    else:
        # Update existing user
        await db.users.update_one(
            {"email": email},
            {"$set": {"picture": oauth_data.get("picture"), "name": oauth_data.get("name", user["name"])}}
        )
        user = await db.users.find_one({"email": email}, {"_id": 0})
    
    # Store session
    session_token = oauth_data.get("session_token", secrets.token_urlsafe(32))
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create JWT tokens
    access_token = create_access_token(user["user_id"], email, user["role"], user.get("tenant_id"))
    refresh_token = create_refresh_token(user["user_id"])
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    await log_audit(user.get("tenant_id"), user["user_id"], "oauth_login", "user", user["user_id"])
    
    user.pop("password_hash", None)
    return user

# ======================= SUPER ADMIN ENDPOINTS =======================

@api_router.get("/admin/tenants")
async def list_tenants(request: Request):
    await require_super_admin(request)
    tenants = await db.tenants.find({}, {"_id": 0}).to_list(1000)
    return tenants

@api_router.post("/admin/tenants")
async def create_tenant(tenant: TenantCreate, request: Request):
    user = await require_super_admin(request)
    tenant_id = f"tenant_{uuid.uuid4().hex[:12]}"
    
    tenant_doc = {
        "tenant_id": tenant_id,
        "name": tenant.name,
        "industry": tenant.industry,
        "description": tenant.description,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "settings": {
            "default_language": "en",
            "supported_languages": ["en", "es"],
            "timezone": "UTC"
        }
    }
    await db.tenants.insert_one(tenant_doc)
    
    # Create default roles for tenant
    default_roles = [
        {"name": "tenant_admin", "name_es": "Administrador", "permissions": ["all"], "is_system": True},
        {"name": "supervisor", "name_es": "Supervisor", "permissions": ["view_all", "assign_tasks", "approve"], "is_system": True},
        {"name": "technician", "name_es": "Técnico", "permissions": ["view_assigned", "update_progress", "upload_evidence"], "is_system": True},
        {"name": "inspector", "name_es": "Inspector", "permissions": ["view_all", "approve", "reject"], "is_system": True},
        {"name": "viewer", "name_es": "Visor", "permissions": ["view_only"], "is_system": True},
    ]
    
    for role_data in default_roles:
        role_doc = {
            "role_id": f"role_{uuid.uuid4().hex[:12]}",
            "tenant_id": tenant_id,
            "name": role_data["name"],
            "name_es": role_data["name_es"],
            "permissions": role_data["permissions"],
            "allowed_checkpoints": [],
            "is_system": role_data["is_system"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.roles.insert_one(role_doc)
    
    await log_audit(None, user["user_id"], "create_tenant", "tenant", tenant_id, {"name": tenant.name})
    
    tenant_doc.pop("_id", None)
    return tenant_doc

@api_router.get("/admin/tenants/{tenant_id}")
async def get_tenant(tenant_id: str, request: Request):
    await require_super_admin(request)
    tenant = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant

@api_router.put("/admin/tenants/{tenant_id}")
async def update_tenant(tenant_id: str, updates: Dict[str, Any], request: Request):
    user = await require_super_admin(request)
    tenant = await db.tenants.find_one({"tenant_id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    allowed_fields = ["name", "industry", "description", "is_active", "settings"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    await db.tenants.update_one({"tenant_id": tenant_id}, {"$set": update_data})
    await log_audit(None, user["user_id"], "update_tenant", "tenant", tenant_id, update_data)
    
    updated = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
    return updated

@api_router.get("/admin/users")
async def list_all_users(request: Request):
    await require_super_admin(request)
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, data: Dict[str, Any], request: Request):
    admin = await require_super_admin(request)
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {}
    if "role" in data:
        update_data["role"] = data["role"]
    if "tenant_id" in data:
        update_data["tenant_id"] = data["tenant_id"]
    
    await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    await log_audit(None, admin["user_id"], "update_user_role", "user", user_id, update_data)
    
    updated = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return updated

@api_router.get("/admin/stats")
async def get_admin_stats(request: Request):
    await require_super_admin(request)
    
    tenant_count = await db.tenants.count_documents({})
    user_count = await db.users.count_documents({})
    active_tenants = await db.tenants.count_documents({"is_active": True})
    item_count = await db.items.count_documents({})
    
    return {
        "total_tenants": tenant_count,
        "active_tenants": active_tenants,
        "total_users": user_count,
        "total_items": item_count
    }

# ======================= TENANT ADMIN ENDPOINTS =======================

@api_router.get("/tenant/checkpoints")
async def list_checkpoints(request: Request):
    user = await require_tenant_admin(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id and user["role"] != "super_admin":
        raise HTTPException(status_code=400, detail="User not assigned to a tenant")
    
    query = {"tenant_id": tenant_id} if tenant_id else {}
    checkpoints = await db.checkpoints.find(query, {"_id": 0}).sort("order", 1).to_list(1000)
    return checkpoints

@api_router.post("/tenant/checkpoints")
async def create_checkpoint(checkpoint: CheckpointCreate, request: Request):
    user = await require_tenant_admin(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="User not assigned to a tenant")
    
    checkpoint_id = f"cp_{uuid.uuid4().hex[:12]}"
    
    checkpoint_doc = {
        "checkpoint_id": checkpoint_id,
        "tenant_id": tenant_id,
        "name": checkpoint.name,
        "name_es": checkpoint.name_es,
        "description": checkpoint.description,
        "description_es": checkpoint.description_es,
        "order": checkpoint.order,
        "allowed_roles": checkpoint.allowed_roles,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.checkpoints.insert_one(checkpoint_doc)
    await log_audit(tenant_id, user["user_id"], "create_checkpoint", "checkpoint", checkpoint_id, {"name": checkpoint.name})
    
    checkpoint_doc.pop("_id", None)
    return checkpoint_doc

@api_router.put("/tenant/checkpoints/{checkpoint_id}")
async def update_checkpoint(checkpoint_id: str, updates: Dict[str, Any], request: Request):
    user = await require_tenant_admin(request)
    tenant_id = user.get("tenant_id")
    
    checkpoint = await db.checkpoints.find_one({"checkpoint_id": checkpoint_id, "tenant_id": tenant_id})
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    
    allowed_fields = ["name", "name_es", "description", "description_es", "order", "allowed_roles", "is_active"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    await db.checkpoints.update_one({"checkpoint_id": checkpoint_id}, {"$set": update_data})
    await log_audit(tenant_id, user["user_id"], "update_checkpoint", "checkpoint", checkpoint_id, update_data)
    
    updated = await db.checkpoints.find_one({"checkpoint_id": checkpoint_id}, {"_id": 0})
    return updated

@api_router.delete("/tenant/checkpoints/{checkpoint_id}")
async def delete_checkpoint(checkpoint_id: str, request: Request):
    user = await require_tenant_admin(request)
    tenant_id = user.get("tenant_id")
    
    checkpoint = await db.checkpoints.find_one({"checkpoint_id": checkpoint_id, "tenant_id": tenant_id})
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    
    await db.checkpoints.delete_one({"checkpoint_id": checkpoint_id})
    await db.subtasks.delete_many({"checkpoint_id": checkpoint_id})
    await log_audit(tenant_id, user["user_id"], "delete_checkpoint", "checkpoint", checkpoint_id)
    
    return {"message": "Checkpoint deleted"}

# Subtasks
@api_router.get("/tenant/checkpoints/{checkpoint_id}/subtasks")
async def list_subtasks(checkpoint_id: str, request: Request):
    user = await require_tenant_admin(request)
    tenant_id = user.get("tenant_id")
    
    subtasks = await db.subtasks.find({"checkpoint_id": checkpoint_id, "tenant_id": tenant_id}, {"_id": 0}).sort("order", 1).to_list(1000)
    return subtasks

@api_router.post("/tenant/checkpoints/{checkpoint_id}/subtasks")
async def create_subtask(checkpoint_id: str, subtask: SubtaskCreate, request: Request):
    user = await require_tenant_admin(request)
    tenant_id = user.get("tenant_id")
    
    checkpoint = await db.checkpoints.find_one({"checkpoint_id": checkpoint_id, "tenant_id": tenant_id})
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    
    # Get next order
    last_subtask = await db.subtasks.find_one({"checkpoint_id": checkpoint_id}, sort=[("order", -1)])
    next_order = (last_subtask["order"] + 1) if last_subtask else 1
    
    subtask_id = f"st_{uuid.uuid4().hex[:12]}"
    
    subtask_doc = {
        "subtask_id": subtask_id,
        "checkpoint_id": checkpoint_id,
        "tenant_id": tenant_id,
        "name": subtask.name,
        "name_es": subtask.name_es,
        "description": subtask.description,
        "description_es": subtask.description_es,
        "requires_evidence": subtask.requires_evidence,
        "evidence_type": subtask.evidence_type,
        "order": next_order,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.subtasks.insert_one(subtask_doc)
    await log_audit(tenant_id, user["user_id"], "create_subtask", "subtask", subtask_id, {"name": subtask.name})
    
    subtask_doc.pop("_id", None)
    return subtask_doc

@api_router.put("/tenant/subtasks/{subtask_id}")
async def update_subtask(subtask_id: str, updates: Dict[str, Any], request: Request):
    user = await require_tenant_admin(request)
    tenant_id = user.get("tenant_id")
    
    subtask = await db.subtasks.find_one({"subtask_id": subtask_id, "tenant_id": tenant_id})
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    allowed_fields = ["name", "name_es", "description", "description_es", "requires_evidence", "evidence_type", "order", "is_active"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    await db.subtasks.update_one({"subtask_id": subtask_id}, {"$set": update_data})
    await log_audit(tenant_id, user["user_id"], "update_subtask", "subtask", subtask_id, update_data)
    
    updated = await db.subtasks.find_one({"subtask_id": subtask_id}, {"_id": 0})
    return updated

@api_router.delete("/tenant/subtasks/{subtask_id}")
async def delete_subtask(subtask_id: str, request: Request):
    user = await require_tenant_admin(request)
    tenant_id = user.get("tenant_id")
    
    subtask = await db.subtasks.find_one({"subtask_id": subtask_id, "tenant_id": tenant_id})
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    await db.subtasks.delete_one({"subtask_id": subtask_id})
    await log_audit(tenant_id, user["user_id"], "delete_subtask", "subtask", subtask_id)
    
    return {"message": "Subtask deleted"}

# Roles
@api_router.get("/tenant/roles")
async def list_roles(request: Request):
    user = await require_tenant_admin(request)
    tenant_id = user.get("tenant_id")
    
    roles = await db.roles.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(1000)
    return roles

@api_router.post("/tenant/roles")
async def create_role(role: RoleCreate, request: Request):
    user = await require_tenant_admin(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="User not assigned to a tenant")
    
    role_id = f"role_{uuid.uuid4().hex[:12]}"
    
    role_doc = {
        "role_id": role_id,
        "tenant_id": tenant_id,
        "name": role.name,
        "name_es": role.name_es,
        "permissions": role.permissions,
        "allowed_checkpoints": role.allowed_checkpoints,
        "is_system": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.roles.insert_one(role_doc)
    await log_audit(tenant_id, user["user_id"], "create_role", "role", role_id, {"name": role.name})
    
    role_doc.pop("_id", None)
    return role_doc

# Tenant Users
@api_router.get("/tenant/users")
async def list_tenant_users(request: Request):
    user = await require_tenant_admin(request)
    tenant_id = user.get("tenant_id")
    
    users = await db.users.find({"tenant_id": tenant_id}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.post("/tenant/users")
async def create_tenant_user(user_data: UserCreate, role: str = Query("technician"), request: Request = None):
    admin = await require_tenant_admin(request)
    tenant_id = admin.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Admin not assigned to a tenant")
    
    email = user_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password_hash = hash_password(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": email,
        "name": user_data.name,
        "password_hash": password_hash,
        "role": role,
        "tenant_id": tenant_id,
        "language": "en",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    await log_audit(tenant_id, admin["user_id"], "create_user", "user", user_id, {"role": role})
    
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return user_doc

@api_router.put("/tenant/users/{user_id}")
async def update_tenant_user(user_id: str, updates: Dict[str, Any], request: Request):
    admin = await require_tenant_admin(request)
    tenant_id = admin.get("tenant_id")
    
    user = await db.users.find_one({"user_id": user_id, "tenant_id": tenant_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    allowed_fields = ["name", "role", "language"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    await log_audit(tenant_id, admin["user_id"], "update_user", "user", user_id, update_data)
    
    updated = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return updated

# Tenant Stats
@api_router.get("/tenant/stats")
async def get_tenant_stats(request: Request):
    user = await require_tenant_admin(request)
    tenant_id = user.get("tenant_id")
    
    user_count = await db.users.count_documents({"tenant_id": tenant_id})
    checkpoint_count = await db.checkpoints.count_documents({"tenant_id": tenant_id})
    item_count = await db.items.count_documents({"tenant_id": tenant_id})
    items_in_progress = await db.items.count_documents({"tenant_id": tenant_id, "status": "in_progress"})
    items_completed = await db.items.count_documents({"tenant_id": tenant_id, "status": "completed"})
    
    return {
        "total_users": user_count,
        "total_checkpoints": checkpoint_count,
        "total_items": item_count,
        "items_in_progress": items_in_progress,
        "items_completed": items_completed
    }

# ======================= WORKER ENDPOINTS =======================

@api_router.get("/worker/tasks")
async def get_worker_tasks(request: Request):
    user = await get_current_user(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="User not assigned to a tenant")
    
    # Get items in progress for this tenant
    items = await db.items.find({"tenant_id": tenant_id, "status": {"$in": ["registered", "in_progress"]}}, {"_id": 0}).to_list(1000)
    
    # Get checkpoints
    checkpoints = await db.checkpoints.find({"tenant_id": tenant_id, "is_active": True}, {"_id": 0}).sort("order", 1).to_list(1000)
    
    # Filter based on role permissions
    user_role = user.get("role")
    if user_role not in ["tenant_admin", "super_admin", "supervisor"]:
        allowed_checkpoints = []
        for cp in checkpoints:
            if not cp.get("allowed_roles") or user_role in cp.get("allowed_roles", []):
                allowed_checkpoints.append(cp)
        checkpoints = allowed_checkpoints
    
    return {"items": items, "checkpoints": checkpoints}

@api_router.get("/worker/items/{item_id}")
async def get_worker_item_detail(item_id: str, request: Request):
    user = await get_current_user(request)
    tenant_id = user.get("tenant_id")
    
    item = await db.items.find_one({"item_id": item_id, "tenant_id": tenant_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Get checkpoints
    checkpoints = await db.checkpoints.find({"tenant_id": tenant_id, "is_active": True}, {"_id": 0}).sort("order", 1).to_list(1000)
    
    # Get subtasks for each checkpoint
    for cp in checkpoints:
        subtasks = await db.subtasks.find({"checkpoint_id": cp["checkpoint_id"], "is_active": True}, {"_id": 0}).sort("order", 1).to_list(1000)
        
        # Get progress for each subtask
        for st in subtasks:
            progress = await db.task_progress.find_one({"item_id": item_id, "subtask_id": st["subtask_id"]}, {"_id": 0})
            st["progress"] = progress if progress else {"status": "pending"}
            
            # Get evidence
            evidence = await db.evidence.find({"item_id": item_id, "subtask_id": st["subtask_id"]}, {"_id": 0}).to_list(100)
            st["evidence"] = evidence
        
        cp["subtasks"] = subtasks
    
    return {"item": item, "checkpoints": checkpoints}

@api_router.post("/worker/items/{item_id}/progress")
async def update_task_progress(item_id: str, progress: TaskProgressUpdate, request: Request):
    user = await get_current_user(request)
    tenant_id = user.get("tenant_id")
    
    item = await db.items.find_one({"item_id": item_id, "tenant_id": tenant_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    subtask = await db.subtasks.find_one({"subtask_id": progress.subtask_id, "tenant_id": tenant_id})
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    # Check if evidence is required and provided
    if progress.status == "completed" and subtask.get("requires_evidence", True):
        evidence_count = await db.evidence.count_documents({"item_id": item_id, "subtask_id": progress.subtask_id})
        if evidence_count == 0:
            raise HTTPException(status_code=400, detail="Evidence required before completing this task")
    
    progress_doc = {
        "progress_id": f"prog_{uuid.uuid4().hex[:12]}",
        "item_id": item_id,
        "subtask_id": progress.subtask_id,
        "checkpoint_id": subtask["checkpoint_id"],
        "tenant_id": tenant_id,
        "worker_id": user["user_id"],
        "status": progress.status,
        "notes": progress.notes,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.task_progress.update_one(
        {"item_id": item_id, "subtask_id": progress.subtask_id},
        {"$set": progress_doc},
        upsert=True
    )
    
    # Update item status if starting work
    if progress.status == "in_progress" and item["status"] == "registered":
        await db.items.update_one({"item_id": item_id}, {"$set": {"status": "in_progress", "updated_at": datetime.now(timezone.utc).isoformat()}})
    
    # Check if all subtasks in checkpoint are completed
    if progress.status == "completed":
        checkpoint_subtasks = await db.subtasks.find({"checkpoint_id": subtask["checkpoint_id"], "is_active": True}).to_list(1000)
        all_completed = True
        for st in checkpoint_subtasks:
            prog = await db.task_progress.find_one({"item_id": item_id, "subtask_id": st["subtask_id"]})
            if not prog or prog.get("status") != "completed":
                all_completed = False
                break
        
        if all_completed:
            # Move to next checkpoint
            current_cp = await db.checkpoints.find_one({"checkpoint_id": subtask["checkpoint_id"]})
            next_cp = await db.checkpoints.find_one({"tenant_id": tenant_id, "order": {"$gt": current_cp["order"]}, "is_active": True}, sort=[("order", 1)])
            
            if next_cp:
                await db.items.update_one({"item_id": item_id}, {"$set": {"current_checkpoint_id": next_cp["checkpoint_id"], "updated_at": datetime.now(timezone.utc).isoformat()}})
            else:
                # All checkpoints completed
                await db.items.update_one({"item_id": item_id}, {"$set": {"status": "completed", "current_checkpoint_id": None, "updated_at": datetime.now(timezone.utc).isoformat()}})
    
    await log_audit(tenant_id, user["user_id"], "update_progress", "task_progress", progress_doc["progress_id"], {"status": progress.status})
    
    return progress_doc

@api_router.post("/worker/items/{item_id}/evidence")
async def upload_evidence(
    item_id: str,
    request: Request,
    subtask_id: str = Form(...),
    evidence_type: str = Form("photo"),
    tag: str = Form("during"),
    note: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    user = await get_current_user(request)
    tenant_id = user.get("tenant_id")
    
    item = await db.items.find_one({"item_id": item_id, "tenant_id": tenant_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    subtask = await db.subtasks.find_one({"subtask_id": subtask_id, "tenant_id": tenant_id})
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    evidence_id = f"ev_{uuid.uuid4().hex[:12]}"
    
    file_data = None
    if file:
        content = await file.read()
        file_data = base64.b64encode(content).decode("utf-8")
    
    evidence_doc = {
        "evidence_id": evidence_id,
        "item_id": item_id,
        "subtask_id": subtask_id,
        "checkpoint_id": subtask["checkpoint_id"],
        "tenant_id": tenant_id,
        "worker_id": user["user_id"],
        "evidence_type": evidence_type,
        "tag": tag,
        "file_data": file_data,
        "file_name": file.filename if file else None,
        "note": note,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.evidence.insert_one(evidence_doc)
    await log_audit(tenant_id, user["user_id"], "upload_evidence", "evidence", evidence_id, {"type": evidence_type, "tag": tag})
    
    evidence_doc.pop("_id", None)
    return evidence_doc

# ======================= CLIENT ENDPOINTS =======================

@api_router.get("/client/items")
async def get_client_items(request: Request):
    user = await get_current_user(request)
    
    items = await db.items.find({"client_id": user["user_id"]}, {"_id": 0}).to_list(1000)
    return items

@api_router.post("/client/items")
async def create_client_item(item: ItemCreate, request: Request):
    user = await get_current_user(request)
    tenant_id = user.get("tenant_id")
    
    # Allow clients to create items even without tenant_id
    # They'll be assigned to a tenant later or use a default
    
    item_id = f"item_{uuid.uuid4().hex[:12]}"
    
    # Get first checkpoint if tenant exists
    first_checkpoint = None
    if tenant_id:
        first_checkpoint = await db.checkpoints.find_one({"tenant_id": tenant_id, "is_active": True}, sort=[("order", 1)])
    
    item_doc = {
        "item_id": item_id,
        "tenant_id": tenant_id,
        "client_id": user["user_id"],
        "name": item.name,
        "description": item.description,
        "item_type": item.item_type,
        "current_checkpoint_id": first_checkpoint["checkpoint_id"] if first_checkpoint else None,
        "status": "registered",
        "metadata": item.metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.items.insert_one(item_doc)
    await log_audit(tenant_id, user["user_id"], "create_item", "item", item_id, {"name": item.name})
    
    item_doc.pop("_id", None)
    return item_doc

@api_router.get("/client/items/{item_id}")
async def get_client_item_detail(item_id: str, request: Request):
    user = await get_current_user(request)
    
    item = await db.items.find_one({"item_id": item_id, "client_id": user["user_id"]}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    tenant_id = item.get("tenant_id")
    
    # Get checkpoints and progress
    checkpoints = []
    if tenant_id:
        checkpoints = await db.checkpoints.find({"tenant_id": tenant_id, "is_active": True}, {"_id": 0}).sort("order", 1).to_list(1000)
        
        for cp in checkpoints:
            subtasks = await db.subtasks.find({"checkpoint_id": cp["checkpoint_id"], "is_active": True}, {"_id": 0}).sort("order", 1).to_list(1000)
            
            for st in subtasks:
                progress = await db.task_progress.find_one({"item_id": item_id, "subtask_id": st["subtask_id"]}, {"_id": 0})
                st["progress"] = progress if progress else {"status": "pending"}
                
                # Get evidence (client can see their item's evidence)
                evidence = await db.evidence.find({"item_id": item_id, "subtask_id": st["subtask_id"]}, {"_id": 0, "file_data": 0}).to_list(100)
                st["evidence_count"] = len(evidence)
            
            cp["subtasks"] = subtasks
    
    return {"item": item, "checkpoints": checkpoints}

# ======================= TENANT ASSIGN ITEM TO CLIENT =======================

class AssignItemToClient(BaseModel):
    item_id: str
    client_email: EmailStr

@api_router.post("/tenant/items/assign")
async def assign_item_to_client(data: AssignItemToClient, request: Request):
    """Tenant admin assigns an item to a client by email"""
    admin = await require_tenant_admin(request)
    tenant_id = admin.get("tenant_id")
    
    # Find client by email
    client = await db.users.find_one({"email": data.client_email.lower()}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found with this email")
    
    # Update item
    item = await db.items.find_one({"item_id": data.item_id, "tenant_id": tenant_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Assign client and tenant
    await db.items.update_one(
        {"item_id": data.item_id},
        {"$set": {"client_id": client["user_id"], "tenant_id": tenant_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Also assign client to tenant if not already
    if not client.get("tenant_id"):
        await db.users.update_one({"user_id": client["user_id"]}, {"$set": {"tenant_id": tenant_id}})
    
    await log_audit(tenant_id, admin["user_id"], "assign_item", "item", data.item_id, {"client_email": data.client_email})
    
    updated = await db.items.find_one({"item_id": data.item_id}, {"_id": 0})
    return updated

# Get all items for tenant (admin view)
@api_router.get("/tenant/items")
async def list_tenant_items(request: Request):
    admin = await require_tenant_admin(request)
    tenant_id = admin.get("tenant_id")
    items = await db.items.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(1000)
    return items

# Create item as tenant admin
@api_router.post("/tenant/items")
async def create_tenant_item(item: ItemCreate, client_email: Optional[str] = Query(None), request: Request = None):
    admin = await require_tenant_admin(request)
    tenant_id = admin.get("tenant_id")
    
    item_id = f"item_{uuid.uuid4().hex[:12]}"
    
    client_id = admin["user_id"]  # default to admin
    if client_email:
        client = await db.users.find_one({"email": client_email.lower()}, {"_id": 0})
        if client:
            client_id = client["user_id"]
            if not client.get("tenant_id"):
                await db.users.update_one({"user_id": client["user_id"]}, {"$set": {"tenant_id": tenant_id}})
    
    first_checkpoint = await db.checkpoints.find_one({"tenant_id": tenant_id, "is_active": True}, sort=[("order", 1)])
    
    item_doc = {
        "item_id": item_id,
        "tenant_id": tenant_id,
        "client_id": client_id,
        "name": item.name,
        "description": item.description,
        "item_type": item.item_type,
        "current_checkpoint_id": first_checkpoint["checkpoint_id"] if first_checkpoint else None,
        "status": "registered",
        "metadata": item.metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.items.insert_one(item_doc)
    await log_audit(tenant_id, admin["user_id"], "create_item", "item", item_id, {"name": item.name})
    
    item_doc.pop("_id", None)
    return item_doc

# ======================= DEMO SEED ENDPOINT =======================

@api_router.post("/admin/seed-full-demo")
async def seed_full_demo(request: Request):
    """Seed complete demo data for demonstration"""
    user = await require_super_admin(request)
    
    # 1. Create tenant
    tenant_id = f"tenant_{uuid.uuid4().hex[:12]}"
    tenant_doc = {
        "tenant_id": tenant_id,
        "name": "Elite Auto Detailing",
        "industry": "auto_detailing",
        "description": "Premium car detailing and paint protection services",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "settings": {"default_language": "es", "supported_languages": ["en", "es"], "timezone": "America/Mexico_City"}
    }
    await db.tenants.insert_one(tenant_doc)
    
    # 2. Create default roles
    for role_data in [
        {"name": "tenant_admin", "name_es": "Administrador", "permissions": ["all"], "is_system": True},
        {"name": "supervisor", "name_es": "Supervisor", "permissions": ["view_all", "assign_tasks", "approve"], "is_system": True},
        {"name": "technician", "name_es": "Técnico", "permissions": ["view_assigned", "update_progress", "upload_evidence"], "is_system": True},
        {"name": "inspector", "name_es": "Inspector", "permissions": ["view_all", "approve", "reject"], "is_system": True},
        {"name": "painter", "name_es": "Pintor", "permissions": ["view_assigned", "update_progress", "upload_evidence"], "is_system": False},
    ]:
        await db.roles.insert_one({
            "role_id": f"role_{uuid.uuid4().hex[:12]}",
            "tenant_id": tenant_id,
            **role_data,
            "allowed_checkpoints": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # 3. Create users
    demo_users = [
        {"name": "Carlos Mendoza", "email": "carlos@elitedetail.com", "role": "tenant_admin"},
        {"name": "Miguel Torres", "email": "miguel@elitedetail.com", "role": "supervisor"},
        {"name": "Roberto Sánchez", "email": "roberto@elitedetail.com", "role": "technician"},
        {"name": "Ana García", "email": "ana@elitedetail.com", "role": "technician"},
        {"name": "Pedro López", "email": "pedro@elitedetail.com", "role": "inspector"},
        {"name": "María Rodríguez", "email": "maria@cliente.com", "role": "client"},
        {"name": "Juan Hernández", "email": "juan@cliente.com", "role": "client"},
    ]
    
    user_ids = {}
    for u in demo_users:
        uid = f"user_{uuid.uuid4().hex[:12]}"
        user_ids[u["email"]] = uid
        existing = await db.users.find_one({"email": u["email"]})
        if not existing:
            await db.users.insert_one({
                "user_id": uid,
                "email": u["email"],
                "name": u["name"],
                "password_hash": hash_password("demo123"),
                "role": u["role"],
                "tenant_id": tenant_id,
                "language": "es",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        else:
            user_ids[u["email"]] = existing.get("user_id", uid)
            await db.users.update_one({"email": u["email"]}, {"$set": {"tenant_id": tenant_id, "role": u["role"]}})
    
    # 4. Create checkpoints with subtasks
    checkpoints_data = [
        {"name": "Intake & Inspection", "name_es": "Recepción e Inspección", "order": 1, "subtasks": [
            {"name": "Exterior Photo Documentation", "name_es": "Documentación Fotográfica Exterior", "evidence_type": "photo"},
            {"name": "Interior Photo Documentation", "name_es": "Documentación Fotográfica Interior", "evidence_type": "photo"},
            {"name": "Damage Assessment", "name_es": "Evaluación de Daños", "evidence_type": "any"},
            {"name": "Client Sign-off", "name_es": "Firma del Cliente", "evidence_type": "document"},
        ]},
        {"name": "Exterior Wash", "name_es": "Lavado Exterior", "order": 2, "subtasks": [
            {"name": "Pre-Rinse", "name_es": "Pre-Enjuague", "evidence_type": "photo"},
            {"name": "Foam Application", "name_es": "Aplicación de Espuma", "evidence_type": "photo"},
            {"name": "Hand Wash", "name_es": "Lavado a Mano", "evidence_type": "photo"},
            {"name": "Wheel & Tire Cleaning", "name_es": "Limpieza de Ruedas y Neumáticos", "evidence_type": "photo"},
            {"name": "Clay Bar Treatment", "name_es": "Tratamiento con Barra de Arcilla", "evidence_type": "photo"},
        ]},
        {"name": "Paint Correction", "name_es": "Corrección de Pintura", "order": 3, "subtasks": [
            {"name": "Paint Thickness Measurement", "name_es": "Medición de Espesor de Pintura", "evidence_type": "photo"},
            {"name": "Compound Polish", "name_es": "Pulido con Compuesto", "evidence_type": "photo"},
            {"name": "Fine Polish", "name_es": "Pulido Fino", "evidence_type": "photo"},
            {"name": "Paint Sealant Application", "name_es": "Aplicación de Sellador", "evidence_type": "photo"},
        ]},
        {"name": "Interior Detailing", "name_es": "Detallado Interior", "order": 4, "subtasks": [
            {"name": "Full Vacuum", "name_es": "Aspirado Completo", "evidence_type": "photo"},
            {"name": "Dashboard & Console", "name_es": "Tablero y Consola", "evidence_type": "photo"},
            {"name": "Leather Conditioning", "name_es": "Acondicionamiento de Cuero", "evidence_type": "photo"},
            {"name": "Glass Cleaning", "name_es": "Limpieza de Vidrios", "evidence_type": "photo"},
        ]},
        {"name": "Final Inspection", "name_es": "Inspección Final", "order": 5, "subtasks": [
            {"name": "Quality Check - Exterior", "name_es": "Control de Calidad - Exterior", "evidence_type": "photo"},
            {"name": "Quality Check - Interior", "name_es": "Control de Calidad - Interior", "evidence_type": "photo"},
            {"name": "Final Photos", "name_es": "Fotos Finales", "evidence_type": "photo"},
            {"name": "Service Report", "name_es": "Reporte de Servicio", "evidence_type": "note"},
        ]},
        {"name": "Delivery", "name_es": "Entrega", "order": 6, "subtasks": [
            {"name": "Client Walkthrough", "name_es": "Revisión con Cliente", "evidence_type": "note"},
            {"name": "Client Approval", "name_es": "Aprobación del Cliente", "evidence_type": "document"},
        ]},
    ]
    
    checkpoint_ids = []
    subtask_map = {}
    for cp_data in checkpoints_data:
        cp_id = f"cp_{uuid.uuid4().hex[:12]}"
        checkpoint_ids.append(cp_id)
        await db.checkpoints.insert_one({
            "checkpoint_id": cp_id, "tenant_id": tenant_id,
            "name": cp_data["name"], "name_es": cp_data["name_es"],
            "description": None, "description_es": None,
            "order": cp_data["order"], "allowed_roles": [],
            "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        })
        subtask_map[cp_id] = []
        for i, st in enumerate(cp_data["subtasks"], 1):
            st_id = f"st_{uuid.uuid4().hex[:12]}"
            subtask_map[cp_id].append(st_id)
            await db.subtasks.insert_one({
                "subtask_id": st_id, "checkpoint_id": cp_id, "tenant_id": tenant_id,
                "name": st["name"], "name_es": st["name_es"],
                "description": None, "description_es": None,
                "requires_evidence": True, "evidence_type": st["evidence_type"],
                "order": i, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    # 5. Create demo items (vehicles) with progress
    vehicles = [
        {"name": "BMW M4 Competition 2024", "desc": "Full ceramic coating package", "type": "vehicle", "status": "in_progress",
         "meta": {"make": "BMW", "model": "M4", "year": "2024", "color": "Isle of Man Green", "vin": "WBS43AZ0XR1234567"},
         "client": "maria@cliente.com", "progress_level": 3},
        {"name": "Mercedes AMG GT 2023", "desc": "Paint correction + interior detail", "type": "vehicle", "status": "in_progress",
         "meta": {"make": "Mercedes-Benz", "model": "AMG GT", "year": "2023", "color": "Obsidian Black", "vin": "WDD1903871A234567"},
         "client": "juan@cliente.com", "progress_level": 1},
        {"name": "Porsche 911 Turbo S 2024", "desc": "Complete detail + PPF", "type": "vehicle", "status": "registered",
         "meta": {"make": "Porsche", "model": "911 Turbo S", "year": "2024", "color": "Guards Red", "vin": "WP0CD2A95RS234567"},
         "client": "maria@cliente.com", "progress_level": 0},
        {"name": "Tesla Model S Plaid 2024", "desc": "Full exterior detail + ceramic", "type": "vehicle", "status": "completed",
         "meta": {"make": "Tesla", "model": "Model S Plaid", "year": "2024", "color": "Pearl White", "vin": "5YJSA1H21RF234567"},
         "client": "juan@cliente.com", "progress_level": 6},
    ]
    
    worker_id = user_ids.get("roberto@elitedetail.com", "")
    
    for v in vehicles:
        item_id = f"item_{uuid.uuid4().hex[:12]}"
        client_uid = user_ids.get(v["client"], "")
        
        current_cp = checkpoint_ids[min(v["progress_level"], len(checkpoint_ids)-1)] if v["progress_level"] < len(checkpoint_ids) else None
        
        await db.items.insert_one({
            "item_id": item_id, "tenant_id": tenant_id,
            "client_id": client_uid, "name": v["name"],
            "description": v["desc"], "item_type": v["type"],
            "current_checkpoint_id": current_cp,
            "status": v["status"], "metadata": v["meta"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Create progress for completed checkpoints
        for cp_idx in range(min(v["progress_level"], len(checkpoint_ids))):
            cp_id = checkpoint_ids[cp_idx]
            for st_id in subtask_map.get(cp_id, []):
                await db.task_progress.update_one(
                    {"item_id": item_id, "subtask_id": st_id},
                    {"$set": {
                        "progress_id": f"prog_{uuid.uuid4().hex[:12]}",
                        "item_id": item_id, "subtask_id": st_id,
                        "checkpoint_id": cp_id, "tenant_id": tenant_id,
                        "worker_id": worker_id, "status": "completed",
                        "notes": "Demo task completed",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }},
                    upsert=True
                )
                # Add demo evidence
                await db.evidence.insert_one({
                    "evidence_id": f"ev_{uuid.uuid4().hex[:12]}",
                    "item_id": item_id, "subtask_id": st_id,
                    "checkpoint_id": cp_id, "tenant_id": tenant_id,
                    "worker_id": worker_id, "evidence_type": "photo",
                    "tag": "after", "file_data": None,
                    "file_name": "demo_photo.jpg", "note": "Demo evidence",
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
    
    # Update test credentials
    try:
        with open("/app/memory/test_credentials.md", "w") as f:
            f.write("""# Test Credentials

## Super Admin
- Email: admin@checkpointhub.com
- Password: admin123
- Role: super_admin

## Tenant Admin (Elite Auto Detailing)
- Email: carlos@elitedetail.com
- Password: demo123
- Role: tenant_admin

## Supervisor
- Email: miguel@elitedetail.com
- Password: demo123
- Role: supervisor

## Technician
- Email: roberto@elitedetail.com
- Password: demo123
- Role: technician

## Inspector
- Email: pedro@elitedetail.com
- Password: demo123
- Role: inspector

## Clients
- Email: maria@cliente.com / Password: demo123 / Role: client
- Email: juan@cliente.com / Password: demo123 / Role: client
""")
    except Exception:
        pass
    
    return {"message": "Full demo seeded", "tenant_id": tenant_id, "users_created": len(demo_users), "vehicles": len(vehicles)}

# ======================= RECEPTIONIST ENDPOINTS =======================

async def require_receptionist_or_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") not in ["super_admin", "tenant_admin", "receptionist", "supervisor"]:
        raise HTTPException(status_code=403, detail="Receptionist or Admin access required")
    return user

@api_router.post("/receptionist/register-client")
async def receptionist_register_client(data: ClientSignup, request: Request):
    """Receptionist registers a client and optionally their vehicle"""
    admin = await require_receptionist_or_admin(request)
    tenant_id = admin.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Not assigned to a tenant")
    
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    
    temp_password = secrets.token_urlsafe(8)
    
    if not existing:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": data.name,
            "password_hash": hash_password(temp_password),
            "role": "client", "tenant_id": tenant_id, "language": "es",
            "phone": data.phone,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    else:
        user_id = existing.get("user_id")
        if not existing.get("tenant_id"):
            await db.users.update_one({"user_id": user_id}, {"$set": {"tenant_id": tenant_id}})
    
    # Create vehicle if provided
    item_id = None
    if data.vehicle_make:
        item_id = f"item_{uuid.uuid4().hex[:12]}"
        first_cp = await db.checkpoints.find_one({"tenant_id": tenant_id, "is_active": True}, sort=[("order", 1)])
        await db.items.insert_one({
            "item_id": item_id, "tenant_id": tenant_id, "client_id": user_id,
            "name": f"{data.vehicle_year or ''} {data.vehicle_make} {data.vehicle_model or ''}".strip(),
            "description": data.notes, "item_type": "vehicle",
            "current_checkpoint_id": first_cp["checkpoint_id"] if first_cp else None,
            "status": "registered",
            "metadata": {"make": data.vehicle_make, "model": data.vehicle_model, "year": data.vehicle_year, "color": data.vehicle_color},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    
    await log_audit(tenant_id, admin["user_id"], "register_client", "user", user_id, {"client_email": email})
    
    # In production, send email with temp_password. For now, log it.
    logger.info(f"Client registered: {email} / temp password: {temp_password}")
    
    return {"user_id": user_id, "email": email, "temp_password": temp_password, "item_id": item_id, "message": "Client registered. Credentials generated."}

# ======================= SUPERVISOR ENDPOINTS =======================

@api_router.post("/supervisor/assign-technician")
async def assign_technician_to_checkpoints(data: TechnicianAssignment, request: Request):
    """Supervisor assigns a technician to specific checkpoints"""
    user = await get_current_user(request)
    if user.get("role") not in ["super_admin", "tenant_admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="Supervisor access required")
    
    tenant_id = user.get("tenant_id")
    tech = await db.users.find_one({"user_id": data.user_id, "tenant_id": tenant_id})
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    # Store assignments
    await db.technician_assignments.update_one(
        {"user_id": data.user_id, "tenant_id": tenant_id},
        {"$set": {"checkpoint_ids": data.checkpoint_ids, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    await log_audit(tenant_id, user["user_id"], "assign_technician", "user", data.user_id, {"checkpoints": data.checkpoint_ids})
    return {"message": "Technician assigned", "user_id": data.user_id, "checkpoint_ids": data.checkpoint_ids}

@api_router.get("/supervisor/assignments")
async def get_technician_assignments(request: Request):
    user = await get_current_user(request)
    if user.get("role") not in ["super_admin", "tenant_admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="Supervisor access required")
    
    tenant_id = user.get("tenant_id")
    assignments = await db.technician_assignments.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(1000)
    return assignments

# ======================= QUOTE REQUEST (PUBLIC) =======================

@api_router.post("/public/quote-request")
async def submit_quote_request(data: QuoteRequest):
    """Public endpoint for clients to request a quote"""
    quote_id = f"quote_{uuid.uuid4().hex[:12]}"
    quote_doc = {
        "quote_id": quote_id,
        "name": data.name, "email": data.email.lower(), "phone": data.phone,
        "item_name": data.item_name, "item_type": data.item_type,
        "description": data.description, "tenant_id": data.tenant_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.quote_requests.insert_one(quote_doc)
    return {"quote_id": quote_id, "message": "Quote request submitted"}

@api_router.get("/tenant/quotes")
async def list_quote_requests(request: Request):
    admin = await require_tenant_admin(request)
    tenant_id = admin.get("tenant_id")
    quotes = await db.quote_requests.find({"tenant_id": tenant_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return quotes

# ======================= TENANT SELF-SIGNUP (PUBLIC) =======================

@api_router.post("/public/tenant-signup")
async def tenant_self_signup(data: TenantSelfSignup):
    """Public endpoint for a business to sign up for their own tenant"""
    email = data.admin_email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create tenant
    tenant_id = f"tenant_{uuid.uuid4().hex[:12]}"
    await db.tenants.insert_one({
        "tenant_id": tenant_id, "name": data.company_name,
        "industry": data.industry, "description": None, "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "settings": {"default_language": data.language, "supported_languages": ["en", "es"]}
    })
    
    # Create default roles
    for role_data in [
        {"name": "tenant_admin", "name_es": "Administrador", "permissions": ["all"], "is_system": True},
        {"name": "supervisor", "name_es": "Supervisor", "permissions": ["view_all", "assign_tasks", "approve"], "is_system": True},
        {"name": "technician", "name_es": "Técnico", "permissions": ["view_assigned", "update_progress", "upload_evidence"], "is_system": True},
        {"name": "inspector", "name_es": "Inspector", "permissions": ["view_all", "approve", "reject"], "is_system": True},
        {"name": "receptionist", "name_es": "Recepcionista", "permissions": ["register_clients", "view_items"], "is_system": True},
    ]:
        await db.roles.insert_one({
            "role_id": f"role_{uuid.uuid4().hex[:12]}", "tenant_id": tenant_id,
            **role_data, "allowed_checkpoints": [], "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Create admin user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    await db.users.insert_one({
        "user_id": user_id, "email": email, "name": data.admin_name,
        "password_hash": hash_password(data.admin_password),
        "role": "tenant_admin", "tenant_id": tenant_id, "language": data.language,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"tenant_id": tenant_id, "user_id": user_id, "message": "Tenant created successfully. Please login."}

# ======================= PUBLIC ENDPOINTS =======================

@api_router.get("/")
async def root():
    return {"message": "Checkpoint Hub API - Workflow Service Operations"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ======================= DATA ARCHIVAL ENDPOINTS =======================

@api_router.post("/admin/archive-daily-data")
async def archive_daily_data(request: Request):
    """Archive daily operational data to history collection"""
    await require_super_admin(request)
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)
    
    # Archive audit logs
    logs = await db.audit_logs.find({"timestamp": {"$lt": today.isoformat()}}).to_list(10000)
    if logs:
        for log in logs:
            log.pop("_id", None)
        await db.audit_logs_history.insert_many(logs)
        await db.audit_logs.delete_many({"timestamp": {"$lt": today.isoformat()}})
    
    # Archive evidence metadata (keep file_data separate)
    evidence = await db.evidence.find({"created_at": {"$lt": today.isoformat()}}).to_list(10000)
    if evidence:
        for ev in evidence:
            ev.pop("_id", None)
        await db.evidence_history.insert_many(evidence)
    
    return {
        "archived_logs": len(logs),
        "archived_evidence": len(evidence),
        "archive_date": yesterday.isoformat()
    }

# ======================= SAMPLE DATA ENDPOINT =======================

@api_router.post("/admin/seed-sample-data")
async def seed_sample_data(tenant_id: str, request: Request):
    """Seed sample car detailing checkpoints and subtasks"""
    await require_super_admin(request)
    
    tenant = await db.tenants.find_one({"tenant_id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Car Detailing Checkpoints
    checkpoints_data = [
        {
            "name": "Intake & Inspection",
            "name_es": "Recepción e Inspección",
            "description": "Initial vehicle inspection and condition documentation",
            "description_es": "Inspección inicial del vehículo y documentación de condición",
            "order": 1,
            "subtasks": [
                {"name": "Photo Documentation - Exterior", "name_es": "Documentación Fotográfica - Exterior", "evidence_type": "photo"},
                {"name": "Photo Documentation - Interior", "name_es": "Documentación Fotográfica - Interior", "evidence_type": "photo"},
                {"name": "Damage Assessment", "name_es": "Evaluación de Daños", "evidence_type": "any"},
                {"name": "Client Sign-off", "name_es": "Firma del Cliente", "evidence_type": "document"}
            ]
        },
        {
            "name": "Exterior Wash",
            "name_es": "Lavado Exterior",
            "description": "Complete exterior washing and decontamination",
            "description_es": "Lavado exterior completo y descontaminación",
            "order": 2,
            "subtasks": [
                {"name": "Pre-Rinse", "name_es": "Pre-Enjuague", "evidence_type": "photo"},
                {"name": "Foam Application", "name_es": "Aplicación de Espuma", "evidence_type": "photo"},
                {"name": "Hand Wash", "name_es": "Lavado a Mano", "evidence_type": "photo"},
                {"name": "Wheel Cleaning", "name_es": "Limpieza de Ruedas", "evidence_type": "photo"},
                {"name": "Clay Bar Treatment", "name_es": "Tratamiento con Barra de Arcilla", "evidence_type": "photo"}
            ]
        },
        {
            "name": "Paint Correction",
            "name_es": "Corrección de Pintura",
            "description": "Paint polishing and defect removal",
            "description_es": "Pulido de pintura y eliminación de defectos",
            "order": 3,
            "subtasks": [
                {"name": "Paint Inspection", "name_es": "Inspección de Pintura", "evidence_type": "photo"},
                {"name": "Compound Polish", "name_es": "Pulido con Compuesto", "evidence_type": "photo"},
                {"name": "Fine Polish", "name_es": "Pulido Fino", "evidence_type": "photo"},
                {"name": "Paint Sealant", "name_es": "Sellador de Pintura", "evidence_type": "photo"}
            ]
        },
        {
            "name": "Interior Detailing",
            "name_es": "Detallado Interior",
            "description": "Complete interior cleaning and conditioning",
            "description_es": "Limpieza interior completa y acondicionamiento",
            "order": 4,
            "subtasks": [
                {"name": "Vacuum", "name_es": "Aspirado", "evidence_type": "photo"},
                {"name": "Dashboard & Console", "name_es": "Tablero y Consola", "evidence_type": "photo"},
                {"name": "Leather/Upholstery Care", "name_es": "Cuidado de Cuero/Tapicería", "evidence_type": "photo"},
                {"name": "Glass Cleaning", "name_es": "Limpieza de Vidrios", "evidence_type": "photo"},
                {"name": "Odor Treatment", "name_es": "Tratamiento de Olores", "evidence_type": "note"}
            ]
        },
        {
            "name": "Final Inspection",
            "name_es": "Inspección Final",
            "description": "Quality check and final documentation",
            "description_es": "Control de calidad y documentación final",
            "order": 5,
            "subtasks": [
                {"name": "Quality Check - Exterior", "name_es": "Control de Calidad - Exterior", "evidence_type": "photo"},
                {"name": "Quality Check - Interior", "name_es": "Control de Calidad - Interior", "evidence_type": "photo"},
                {"name": "Final Photos", "name_es": "Fotos Finales", "evidence_type": "photo"},
                {"name": "Service Notes", "name_es": "Notas de Servicio", "evidence_type": "note"}
            ]
        },
        {
            "name": "Delivery",
            "name_es": "Entrega",
            "description": "Vehicle handover to client",
            "description_es": "Entrega del vehículo al cliente",
            "order": 6,
            "subtasks": [
                {"name": "Client Walkthrough", "name_es": "Revisión con Cliente", "evidence_type": "note"},
                {"name": "Client Approval", "name_es": "Aprobación del Cliente", "evidence_type": "document"},
                {"name": "Handover Complete", "name_es": "Entrega Completa", "evidence_type": "note"}
            ]
        }
    ]
    
    created_checkpoints = []
    for cp_data in checkpoints_data:
        checkpoint_id = f"cp_{uuid.uuid4().hex[:12]}"
        
        checkpoint_doc = {
            "checkpoint_id": checkpoint_id,
            "tenant_id": tenant_id,
            "name": cp_data["name"],
            "name_es": cp_data["name_es"],
            "description": cp_data["description"],
            "description_es": cp_data["description_es"],
            "order": cp_data["order"],
            "allowed_roles": [],
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.checkpoints.insert_one(checkpoint_doc)
        
        # Create subtasks
        for i, st_data in enumerate(cp_data["subtasks"], 1):
            subtask_doc = {
                "subtask_id": f"st_{uuid.uuid4().hex[:12]}",
                "checkpoint_id": checkpoint_id,
                "tenant_id": tenant_id,
                "name": st_data["name"],
                "name_es": st_data["name_es"],
                "description": None,
                "description_es": None,
                "requires_evidence": True,
                "evidence_type": st_data["evidence_type"],
                "order": i,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.subtasks.insert_one(subtask_doc)
        
        checkpoint_doc.pop("_id", None)
        created_checkpoints.append(checkpoint_doc)
    
    return {"message": "Sample data seeded", "checkpoints": len(created_checkpoints)}

# Include router
app.include_router(api_router)

# CORS Configuration
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[frontend_url, "http://localhost:3000", "https://checkpoint-hub-4.preview.emergentagent.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event
@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.tenants.create_index("tenant_id", unique=True)
    await db.checkpoints.create_index([("tenant_id", 1), ("order", 1)])
    await db.subtasks.create_index([("checkpoint_id", 1), ("order", 1)])
    await db.items.create_index([("tenant_id", 1), ("client_id", 1)])
    await db.evidence.create_index([("item_id", 1), ("subtask_id", 1)])
    await db.task_progress.create_index([("item_id", 1), ("subtask_id", 1)])
    await db.audit_logs.create_index("timestamp")
    await db.login_attempts.create_index("identifier")
    
    # Seed super admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@checkpointhub.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": admin_email,
            "name": "Super Admin",
            "password_hash": hash_password(admin_password),
            "role": "super_admin",
            "tenant_id": None,
            "language": "en",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Super admin created: {admin_email}")
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Super admin password updated")
    
    # Write test credentials
    try:
        Path("/app/memory").mkdir(exist_ok=True)
        with open("/app/memory/test_credentials.md", "w") as f:
            f.write(f"""# Test Credentials

## Super Admin
- Email: {admin_email}
- Password: {admin_password}
- Role: super_admin

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh
- POST /api/auth/session (Google OAuth)
""")
    except Exception as e:
        logger.warning(f"Could not write test credentials: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
