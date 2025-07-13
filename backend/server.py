from fastapi import FastAPI, HTTPException, Depends, Form, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel, Field
from typing import Optional, List
import os
import jwt
import hashlib
from datetime import datetime, timedelta
import uuid
import json
from bson import ObjectId

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = MongoClient(mongo_url)
db = client.internship_monitoring

# Security
security = HTTPBearer()
SECRET_KEY = "your-secret-key-change-in-production"

# Collections
users_collection = db.users
internships_collection = db.internships
reports_collection = db.reports
evaluations_collection = db.evaluations
applications_collection = db.applications

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    password: str
    role: str  # "student" or "kaprodi"
    full_name: str
    student_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

class LoginRequest(BaseModel):
    username: str
    password: str

class InternshipProgram(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    company_name: str
    description: str
    duration: str
    requirements: str
    max_students: int
    status: str = "active"
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)

class Report(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    internship_id: str
    title: str
    content: str
    file_path: Optional[str] = None
    submitted_at: datetime = Field(default_factory=datetime.now)
    status: str = "submitted"

class Evaluation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    internship_id: str
    grade: str
    feedback: str
    evaluated_by: str
    evaluated_at: datetime = Field(default_factory=datetime.now)

class Application(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    internship_id: str
    status: str = "pending"  # pending, approved, rejected
    applied_at: datetime = Field(default_factory=datetime.now)
    documents: List[str] = []

# Helper functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_jwt_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verify_jwt_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_jwt_token(token)
    user = users_collection.find_one({"id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Initialize default users
def init_default_users():
    if users_collection.count_documents({}) == 0:
        # Create default Kaprodi
        kaprodi = User(
            username="kaprodi",
            email="kaprodi@telkomuniversity.ac.id",
            password=hash_password("kaprodi123"),
            role="kaprodi",
            full_name="Dr. Kaprodi Sistem Informasi"
        )
        users_collection.insert_one(kaprodi.dict())
        
        # Create default Student
        student = User(
            username="student1",
            email="student1@student.telkomuniversity.ac.id",
            password=hash_password("student123"),
            role="student",
            full_name="Ahmad Mahasiswa",
            student_id="1301194001"
        )
        users_collection.insert_one(student.dict())
        
        # Create sample internship programs
        internship1 = InternshipProgram(
            title="Software Development Internship",
            company_name="PT. Telkom Indonesia",
            description="Develop and maintain software applications",
            duration="6 months",
            requirements="Programming skills in Python/Java",
            max_students=5,
            created_by=kaprodi.id
        )
        internships_collection.insert_one(internship1.dict())
        
        internship2 = InternshipProgram(
            title="Data Analyst Internship",
            company_name="PT. Gojek",
            description="Analyze data and create insights",
            duration="4 months",
            requirements="SQL, Python, Data visualization skills",
            max_students=3,
            created_by=kaprodi.id
        )
        internships_collection.insert_one(internship2.dict())

# Routes
@app.on_event("startup")
async def startup_event():
    init_default_users()

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

@app.post("/api/login")
async def login(request: LoginRequest):
    user = users_collection.find_one({"username": request.username})
    if not user or not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"],
            "full_name": user["full_name"],
            "student_id": user.get("student_id")
        }
    }

@app.post("/api/register")
async def register(user: User):
    existing_user = users_collection.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user.password = hash_password(user.password)
    users_collection.insert_one(user.dict())
    return {"message": "User created successfully"}

@app.get("/api/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "email": current_user["email"],
        "role": current_user["role"],
        "full_name": current_user["full_name"],
        "student_id": current_user.get("student_id")
    }

# Dashboard endpoints
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "kaprodi":
        total_students = users_collection.count_documents({"role": "student"})
        total_internships = internships_collection.count_documents({})
        total_reports = reports_collection.count_documents({})
        pending_applications = applications_collection.count_documents({"status": "pending"})
        
        return {
            "total_students": total_students,
            "total_internships": total_internships,
            "total_reports": total_reports,
            "pending_applications": pending_applications
        }
    else:
        # Student stats
        student_applications = applications_collection.count_documents({"student_id": current_user["id"]})
        student_reports = reports_collection.count_documents({"student_id": current_user["id"]})
        evaluations = evaluations_collection.count_documents({"student_id": current_user["id"]})
        
        return {
            "applications": student_applications,
            "reports": student_reports,
            "evaluations": evaluations
        }

# Students management (Kaprodi only)
@app.get("/api/students")
async def get_students(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "kaprodi":
        raise HTTPException(status_code=403, detail="Access denied")
    
    students = list(users_collection.find({"role": "student"}))
    # Convert MongoDB ObjectId to string for JSON serialization
    for student in students:
        if "_id" in student:
            del student["_id"]
    return students

@app.post("/api/students")
async def create_student(student: User, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "kaprodi":
        raise HTTPException(status_code=403, detail="Access denied")
    
    student.role = "student"
    student.password = hash_password(student.password)
    users_collection.insert_one(student.dict())
    return {"message": "Student created successfully"}

@app.put("/api/students/{student_id}")
async def update_student(student_id: str, student: User, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "kaprodi":
        raise HTTPException(status_code=403, detail="Access denied")
    
    users_collection.update_one(
        {"id": student_id},
        {"$set": student.dict()}
    )
    return {"message": "Student updated successfully"}

@app.delete("/api/students/{student_id}")
async def delete_student(student_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "kaprodi":
        raise HTTPException(status_code=403, detail="Access denied")
    
    users_collection.delete_one({"id": student_id})
    return {"message": "Student deleted successfully"}

# Internship programs
@app.get("/api/internships")
async def get_internships(current_user: dict = Depends(get_current_user)):
    internships = list(internships_collection.find({}))
    # Convert MongoDB ObjectId to string for JSON serialization
    for internship in internships:
        if "_id" in internship:
            del internship["_id"]
    return internships

@app.post("/api/internships")
async def create_internship(internship: InternshipProgram, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "kaprodi":
        raise HTTPException(status_code=403, detail="Access denied")
    
    internship.created_by = current_user["id"]
    internships_collection.insert_one(internship.dict())
    return {"message": "Internship program created successfully"}

@app.put("/api/internships/{internship_id}")
async def update_internship(internship_id: str, internship: InternshipProgram, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "kaprodi":
        raise HTTPException(status_code=403, detail="Access denied")
    
    internships_collection.update_one(
        {"id": internship_id},
        {"$set": internship.dict()}
    )
    return {"message": "Internship program updated successfully"}

@app.delete("/api/internships/{internship_id}")
async def delete_internship(internship_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "kaprodi":
        raise HTTPException(status_code=403, detail="Access denied")
    
    internships_collection.delete_one({"id": internship_id})
    return {"message": "Internship program deleted successfully"}

# Applications
@app.post("/api/applications")
async def apply_internship(application: Application, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if already applied
    existing_application = applications_collection.find_one({
        "student_id": current_user["id"],
        "internship_id": application.internship_id
    })
    if existing_application:
        raise HTTPException(status_code=400, detail="Already applied to this internship")
    
    application.student_id = current_user["id"]
    applications_collection.insert_one(application.dict())
    return {"message": "Application submitted successfully"}

@app.get("/api/applications")
async def get_applications(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "kaprodi":
        applications = list(applications_collection.find({}))
        # Get student and internship details
        for app in applications:
            if "_id" in app:
                del app["_id"]
            student = users_collection.find_one({"id": app["student_id"]})
            internship = internships_collection.find_one({"id": app["internship_id"]})
            app["student_name"] = student["full_name"] if student else "Unknown"
            app["internship_title"] = internship["title"] if internship else "Unknown"
    else:
        applications = list(applications_collection.find({"student_id": current_user["id"]}))
        for app in applications:
            if "_id" in app:
                del app["_id"]
            internship = internships_collection.find_one({"id": app["internship_id"]})
            app["internship_title"] = internship["title"] if internship else "Unknown"
    
    return applications

@app.put("/api/applications/{application_id}/status")
async def update_application_status(application_id: str, status: str = Form(...), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "kaprodi":
        raise HTTPException(status_code=403, detail="Access denied")
    
    applications_collection.update_one(
        {"id": application_id},
        {"$set": {"status": status}}
    )
    return {"message": "Application status updated successfully"}

# Reports
@app.get("/api/reports")
async def get_reports(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "kaprodi":
        reports = list(reports_collection.find({}))
        for report in reports:
            if "_id" in report:
                del report["_id"]
            student = users_collection.find_one({"id": report["student_id"]})
            internship = internships_collection.find_one({"id": report["internship_id"]})
            report["student_name"] = student["full_name"] if student else "Unknown"
            report["internship_title"] = internship["title"] if internship else "Unknown"
    else:
        reports = list(reports_collection.find({"student_id": current_user["id"]}))
        for report in reports:
            if "_id" in report:
                del report["_id"]
            internship = internships_collection.find_one({"id": report["internship_id"]})
            report["internship_title"] = internship["title"] if internship else "Unknown"
    
    return reports

@app.post("/api/reports")
async def create_report(report: Report, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Access denied")
    
    report.student_id = current_user["id"]
    reports_collection.insert_one(report.dict())
    return {"message": "Report submitted successfully"}

# Evaluations
@app.get("/api/evaluations")
async def get_evaluations(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "kaprodi":
        evaluations = list(evaluations_collection.find({}))
        for eval in evaluations:
            if "_id" in eval:
                del eval["_id"]
            student = users_collection.find_one({"id": eval["student_id"]})
            internship = internships_collection.find_one({"id": eval["internship_id"]})
            eval["student_name"] = student["full_name"] if student else "Unknown"
            eval["internship_title"] = internship["title"] if internship else "Unknown"
    else:
        evaluations = list(evaluations_collection.find({"student_id": current_user["id"]}))
        for eval in evaluations:
            if "_id" in eval:
                del eval["_id"]
            internship = internships_collection.find_one({"id": eval["internship_id"]})
            eval["internship_title"] = internship["title"] if internship else "Unknown"
    
    return evaluations

@app.post("/api/evaluations")
async def create_evaluation(evaluation: Evaluation, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "kaprodi":
        raise HTTPException(status_code=403, detail="Access denied")
    
    evaluation.evaluated_by = current_user["id"]
    evaluations_collection.insert_one(evaluation.dict())
    return {"message": "Evaluation created successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)