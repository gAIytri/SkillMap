from config.database import engine, Base
from models.user import User
from models.project import Project
from models.credit_transaction import CreditTransaction

print('Testing connection to Neon...')
Base.metadata.create_all(bind=engine)
print('✅ Database connection successful!')
print('✅ All tables created in Neon!')