from django.urls import path
from .views import *
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
   
    path('generate/token',Login.as_view()),

    path('admin/reg',Admin_Dashboard_Details.as_view()),
    path('admin/crud',Admin_Dashboard_Cruds.as_view()),

    path('emp/reg',Employee_ticket_register.as_view()),
    

    path('manager/view',HrManager_Dashboard__View.as_view()),
    path('manager/assign',HrManager_Dashboard_Assign.as_view()),
     

   # AppOne/urls.py
    path('hr/view', HR_List_View.as_view()),
    path("hr/status",HR_Dashboard_status_change.as_view()),

    path('TL/view',TL_Query_view.as_view()),
    path('TL/status',TL_Status_Approval.as_view()),

    path('HR/final/acceptance',HR_Final_acceptance.as_view()),

          
]+ static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
