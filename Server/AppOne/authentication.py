from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import jwt , calendar
from datetime import datetime , timedelta
from .models import *
from .throttle import *
from Server import settings 



class Token_Authentication_Process(BaseAuthentication):   
    @staticmethod
    def create_tokens(data):
       
        now = timezone.now() # ✅ use singular: "minute", "hour", "day"
        iat = int(now.timestamp())
    # Expiration (e.g. 1 day later) as integer timestamp
        exp = int((now + timedelta(days=1)).timestamp())
        payload = {
            "user_id": data.id,
            "iat": iat,
            "exp": exp,
        # (other claims like "iss" or custom data can go here)
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        return token  
       

    
    def authenticate(self, request):
        headers = request.headers.get('Authorization',None)
        
        if headers is None:
            raise AuthenticationFailed("There is no token found in the Headers")
        try:
            token = headers
                
            token_decode = jwt.decode(token,settings.SECRET_KEY,algorithms='HS256')
            
            orm_fetch = Employee.objects.get(id=token_decode['user_id']) 
            
            print({"check":"step1"})
            
        except Employee.DoesNotExist:
            
            raise AuthenticationFailed("Employee data doesnt found in DB")
               
        except jwt.ExpiredSignatureError:
                   
            raise AuthenticationFailed("Token has Expired")
        
        except jwt.InvalidTokenError: 
            
            raise AuthenticationFailed("Invalid Token")
            
        return (orm_fetch,None)
    
