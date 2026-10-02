import os
import logging
from typing import Optional
import jwt
from jwt import PyJWKClient, PyJWKClientError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv
from repository.resume_repository import check_session_owner

load_dotenv()

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Initialize JWKS client if SUPABASE_URL is configured
_jwks_client: Optional[PyJWKClient] = None


def get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        supabase_url = os.getenv("SUPABASE_URL") or SUPABASE_URL
        if not supabase_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Server configuration error: SUPABASE_URL is not set for ES256 verification.",
            )
        jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)
    return _jwks_client


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    FastAPI dependency that extracts and cryptographically verifies the Supabase JWT token.
    Supports modern asymmetric ES256 (via Supabase JWKS) as well as legacy HS256.
    Returns the user dictionary containing 'id', 'email', and the decoded payload.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Read the token header to determine the signing algorithm and key id
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "ES256")
        kid = header.get("kid")
    except Exception as e:
        logger.warning(f"Failed to parse JWT header: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token header format.",
        )

    payload = None

    # Case 1: Asymmetric token (ES256 / RS256 with kid - Modern Supabase standard)
    if alg == "ES256" or kid:
        try:
            jwks = get_jwks_client()
            signing_key = jwks.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256"],
                audience="authenticated",
                leeway=30,  # 30s clock drift tolerance (RFC 7519) to prevent iat immature signature errors
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token has expired. Please sign in again.",
            )
        except (PyJWKClientError, jwt.PyJWTError) as e:
            logger.warning(f"ES256 JWKS verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Could not validate credentials: {str(e)}",
            )

    # Case 2: Legacy symmetric token (HS256)
    elif alg == "HS256":
        secret = os.getenv("SUPABASE_JWT_SECRET") or SUPABASE_JWT_SECRET
        if not secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Server configuration error: SUPABASE_JWT_SECRET not set for HS256 token.",
            )
        try:
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                audience="authenticated",
                leeway=30,  # 30s clock drift tolerance
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token has expired. Please sign in again.",
            )
        except jwt.PyJWTError as e:
            logger.warning(f"HS256 verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unsupported token algorithm: {alg}",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing subject claim (user_id).",
        )

    return {
        "id": str(user_id),
        "email": payload.get("email"),
        "payload": payload,
    }


def verify_session_ownership(session_id: str, user_id: str) -> None:
    """
    Enforces that the requested session_id is owned by the authenticated user_id.
    Raises 403 Forbidden if the user does not own the session.
    """
    is_owner = check_session_owner(session_id=session_id, user_id=user_id)
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to access or modify this tailoring session.",
        )
