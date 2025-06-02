from rest_framework.views import APIView 
from django.shortcuts import render
from rest_framework.response import Response
from rest_framework import status
from .models import *
from django.http import Http404
from .serializers import *
from rest_framework.exceptions import AuthenticationFailed , NotFound ,ValidationError 
from rest_framework.decorators import api_view
# from .utils import *
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view , permission_classes ,authentication_classes
from Server import settings
from datetime import datetime, timedelta ,date
from rest_framework.authentication import BasicAuthentication
from django.core.mail import send_mail
from .authentication import Token_Authentication_Process
from .throttle import DemoThrottle
from django.contrib.auth.hashers import make_password , check_password
 

class Login(APIView):

    authentication_classes = []
    permission_classes = []
    def post(self, request):
        user_email = request.data.get('email')
        selected_row = Employee.objects.filter(email=user_email).first()
        if not selected_row:
            raise AuthenticationFailed("Email u have given doesnt exists")
        if not check_password(request.data['password'], selected_row.password):
            raise AuthenticationFailed("Password doesnt match")    
        token_data = Token_Authentication_Process.create_tokens(data=selected_row)
        return Response({
            "Token": token_data,
            "Emp_name": selected_row.name,
            "Emp_mail": selected_row.email,
            "role": selected_row.role,
            "password": selected_row.password
        })

class Admin_Dashboard_Details(APIView):
   #admin api which give every employee details as an payload
    authentication_classes = [Token_Authentication_Process]
    def get(self, request):
            try:
                token = request.user
            except:
               raise AuthenticationFailed("no user found")
            db_check = Employee.objects.get(email = token.email)
            # if db_check.role != "Admin":
            #     raise AuthenticationFailed("The logged in user is not an Admin")
            all_emp_data = Employee.objects.all()
            array = []
            for i in all_emp_data:
                show_dict = {
                    "email":i.email,
                    "name":i.name,
                    "Gender":i.gender.Genders,
                    "role":i.role,
                    "department":i.department.department_name
                    
                }
                array.append(show_dict)
            return Response({"data":array},status=status.HTTP_200_OK)
            
    def post(self, request):
            token = request.user
            payload = request.data
            password = request.data['password']
            encrypt = make_password(password)
            request.data['password'] = encrypt
            serialize_datas = EmployeeSerializers01(data=payload)
            if serialize_datas.is_valid(raise_exception=True):
                serialize_datas.save()
                return Response(serialize_datas.data,status=status.HTTP_200_OK)
              
class Admin_Dashboard_Cruds(APIView):
    authentication_classes = [Token_Authentication_Process]
    def get_object(self,request):
        token =request.user
        emp_mail_payload = request.data.get('emp_email')
        if not emp_mail_payload:
            raise AuthenticationFailed("Employee mail payload is missing")
        if not token.email == "admin@gmail.com":
            raise NotFound("You are not authorized to perform this action")
        try:
            employee = Employee.objects.get(email=request.data['emp_email'])
            return employee
        except Employee.DoesNotExist:
            raise NotFound("Employee email not found")  
    def get(self, request):
        employee = self.get_object(request)
        serializer = EmployeeSerializer(employee)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        employee = self.get_object(request)
        serializer = EmployeeSerializer(employee, data=request.data , partial =True)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        

    def delete(self, request):
        employee = self.get_object(request)
        employee.delete()
        return Response({"message": "Employee deleted successfully"}, status=status.HTTP_200_OK)
    

class Employee_ticket_view(APIView):
    authentication_classes = [Token_Authentication_Process]

    def get(self, request):
        token = request.user
        try:
            leave_fetch_orm = LeaveRequest.objects.filter(employee_id=token.id)
            ticket_data = []
            total_tickets_count = leave_fetch_orm.count()

            employee_data = {
                "employee_name": token.name,
                "employee_mail": token.email,
                "Total_leave_tickets" : total_tickets_count
            }
            
            for i in leave_fetch_orm:
                          
                            leave_ticket_dict = {
                                "Employee_Name": token.name,
                                "Employee_role": i.employee.role,
                                "Employee_email": token.email,
                                "ticket_id": i.id,
                                "leave_type": i.leave_type.leave_name,
                                "reason": i.reason,
                                "start_date": str(i.start_date),
                                "end_date": str(i.end_date),        
                                "applied_at": str(i.applied_at),
                                "status": i.status,
                                "attachment": i.attachment.url if i.attachment else "No attachment",
                                "message":i.employee_message,
                                "hr_message":i.hr_message or "",
                   
                            }
                         
                            ticket_data.append(leave_ticket_dict)
            Emergency_leave_filter = LeaveRequest.objects.filter(employee_id = token.id,status__in = ["re-raised-approved","approved"],leave_type_id = 1).count()                        
            Sick_leave_filter = LeaveRequest.objects.filter(employee_id = token.id,status__in = ["re-raised-approved","approved"],leave_type_id = 2).count()
            Planned_leave_filter = LeaveRequest.objects.filter(employee_id = token.id,status__in = ["re-raised-approved","approved"],leave_type_id = 3).count()



            try:
                orm_fetch = Employee.objects.get(id = token.id)
                leave_remaining_format = {
                    "Remaining_Planned_Leave": f"{orm_fetch.gender.Planned_Leave - Planned_leave_filter} / {orm_fetch.gender.Planned_Leave}",
                    "Remaining_Sick_Leave": f"{orm_fetch.gender.Sick_Leave - Sick_leave_filter} / {orm_fetch.gender.Sick_Leave}",
                    "Remaining_Emergency_Leave": f"{orm_fetch.gender.Emergency_Leave - Emergency_leave_filter} / {orm_fetch.gender.Emergency_Leave}" 
                }
            except Total_leave_remaining.DoesNotExist:
                leave_remaining_format = {
                    "Remaining_Planned_Leave": getattr(token.gender, 'Planned_Leave', 0),
                    "Remaining_Sick_Leave": getattr(token.gender, 'Sick_Leave', 0),
                    "Remaining_Emergency_Leave": getattr(token.gender, 'Emergency_Leave', 0)
                }

            return Response(
                {"tickets_data": ticket_data, "remaining_leave": leave_remaining_format,"emp_info":employee_data},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": f"Server error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class Employee_ticket_register(APIView):
    authentication_classes = [Token_Authentication_Process]

    def post(self, request):
        token = request.user    
        ticket_payload = request.data.copy()
        start_date = ticket_payload['start_date']
        end_date = ticket_payload['end_date']
        leave_type = ticket_payload['leave_type']
        print({"startdate":start_date,"end_date":end_date})
      
        if not (start_date <= end_date):
            raise AuthenticationFailed("give date details properly")
        ticket_payload['employee'] = token.id
        print({"checking":ticket_payload})
        serializer = LeaveRequestSerializerFinal(data=ticket_payload)

        try:
            if serializer.is_valid(raise_exception=True):
                start_date_clean = serializer.validated_data['start_date']
                end_date_clean = serializer.validated_data['end_date']
                today = date.today()
                if leave_type == "3":
                    if not (start_date_clean > today + timedelta(days=30)):
                        raise AuthenticationFailed("Planned leave should be 30 days prior ")
                instance = serializer.save()
                print({"datasss":instance.id})
                orm_fetch_ticket = LeaveRequest.objects.get(id = instance.id)
                # if orm_fetch_ticket.status == "rejected":
                #     if re_araise_payload == "re-raised":
                #         orm_fetch_ticket.re_raise_status = "re-raised"
                #         orm_fetch_ticket.save()
                #     if accepting_status_payload == "rejection-accepted":
                #         orm_fetch_ticket.re_raise_status = "rejection-accepted"
                #         orm_fetch_ticket.save()
                
                # leave_request = LeaveRequest.objects.get(id=instance.id)
                # subject = f"New Leave Request from {leave_request.employee.name}"
                # message = f"""
                # Dear Hr Manager,
                                                                                              
                # {leave_request.employee.name} has submitted a leave request.
                                                 
                # Leave Type  : {leave_request.leave_type}
                # From        : {leave_request.start_date}
                # To          : {leave_request.end_date}
                # Reason      : {leave_request.reason}
                                                            
                # Kindly review the leave for Approval.
     
                     
                # Regards,
                # HR Ticketing System
                # """
                # send_mail(
                #     subject,
                #     message,
                #     settings.EMAIL_HOST_USER,
                #     ['jebasharon.p@solvedge.in'],#[hr_employee.email],
                #     fail_silently=False,
                #     )
                    
                return Response(status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": f"Failed to create ticket: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        token = request.user
        ticket_payload = request.data
        re_araise_payload = request.data.get("re_araise_payload")
        accepting_status_payload = request.data.get("accepting_status_payload")
        query_answer_payload = request.data.get('query_answer_payload')
        try:
            single_ticket_fetch = LeaveRequest.objects.get(id=ticket_payload.get('id'))
            if re_araise_payload:
                single_ticket_fetch.status = "re-raised"
                single_ticket_fetch.save()
                return Response(status=status.HTTP_200_OK)
            if accepting_status_payload:
                single_ticket_fetch.status = "rejection-accepted"
                single_ticket_fetch.save()
                return Response(status=status.HTTP_200_OK)

            if single_ticket_fetch.employee_id != token.id:
                return Response({"detail": "Unauthorized to update this ticket"}, status=status.HTTP_403_FORBIDDEN)
            serializer = LeaveRequestSerializerFinal(single_ticket_fetch, data=ticket_payload, partial=True)
            if serializer.is_valid(raise_exception=True):
                serializer.save()
                if query_answer_payload:
                    single_ticket_fetch.status ="query-answered"
                    single_ticket_fetch.save()
                return Response(status=status.HTTP_200_OK)
                
        except LeaveRequest.DoesNotExist:
            return Response({"detail": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": f"Failed to update ticket: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        token = request.user
        ticket_id = request.data.get('id')
        try:
            ticket = LeaveRequest.objects.get(id=ticket_id)
            if ticket.employee_id != token.id:
                return Response({"detail": "Unauthorized to delete this ticket"}, status=status.HTTP_403_FORBIDDEN)
            ticket.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except LeaveRequest.DoesNotExist:
            return Response({"detail": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": f"Failed to delete ticket: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)   



class HrManager_Dashboard__View(APIView):
     throttle_classes = [DemoThrottle]
     authentication_classes = [Token_Authentication_Process] 
     def post(self , request):
        token = request.user
        typeofleave = request.data.get('leave_type')
        print(type(typeofleave))
        if not token.role == 'Manager':
            raise AuthenticationFailed("Given Credentials Doesn't match Manager role")
            
    
        if not typeofleave:
              employee_hr = Employee.objects.filter(role='HR')
              array = []
              for i in employee_hr:
                    dict = {
                    'email':i.email
                    }
                    array.append(dict)
              all_leaves = LeaveRequest.objects.all()
              ticket_id = []
              for i in all_leaves:
                  ticket_id_dict = {
                      "id":i.id
                  }
                  ticket_id.append(ticket_id_dict)
              assignment_fetch = Assignment_Table.objects.all()
              assign_ticket_id = []
              for i in assignment_fetch:
                  assign_dict = {
                      "id":i.assigned_ticket_id
                  }
                  assign_ticket_id.append(assign_dict)
              hr_data = []  
              for i in assignment_fetch:
                  hr_data_dict = {
                      "hr_ticket":i.assigned_ticket_id,
                      "hremail":i.assigned_to.email ,
                      "hrname":i.assigned_to.name
                  }
                  hr_data.append(hr_data_dict)

              serializers = Hr_serializer_table(all_leaves,many=True).data
              profile_show  = [{"name":token.name,"email":token.email}]
              return Response({"tickets_data":serializers,"hr_details":array,"assigned_ticket_id"
                                    :assign_ticket_id,"ticket_id":ticket_id,"hr_data_show":hr_data ,"profile":profile_show})
                
            
        
        orm_fetch_all = LeaveType.objects.all()
        return Response({"Available leave_type":orm_fetch_all.values()})
class HrManager_Dashboard_Assign(APIView):
        authentication_classes = [Token_Authentication_Process]
        def post(self, request):
            token = request.user
            hr_email =request.data.get('hr_email')
            leave_id = request.data.get('leave_id')
            status_changing_payload = request.data.get('status')
                

            hr_employee = Employee.objects.get(email=hr_email)
     
        
            fetch_ticket_id = LeaveRequest.objects.get(id=leave_id)
            if status_changing_payload:
                fetch_ticket_id.status = "in-progress"
                fetch_ticket_id.save()
            assign = Assignment_Table(assigned_to=hr_employee,assigned_ticket_id= leave_id)
            assign.save()
            return Response(status=status.HTTP_200_OK)
        def put(self,request):
            hr_email =request.data.get('hr_email')
            leave_id = request.data.get('leave_id')
         

            hr_employee = Employee.objects.get(email=hr_email)
            fetch_ticket_id = LeaveRequest.objects.get(id=leave_id)
            print({"hellooo":fetch_ticket_id.id})
            assigment_table = Assignment_Table.objects.filter(assigned_ticket=leave_id)
            assigment_table2 = Assignment_Table.objects.get(assigned_ticket_id=leave_id)
            print({"datas":assigment_table2.id})
            if assigment_table:
                if assigment_table2.assigned_to_id == hr_employee.id:
                    raise AuthenticationFailed("You are assigning the same HR")

            if fetch_ticket_id.status == "in-progress-tl-level":
                raise AuthenticationFailed("Ticket is being processed by hr cant reassign now")
                   
            assigment_table2.assigned_ticket_id = fetch_ticket_id.id
            assigment_table2.assigned_to_id = hr_employee.id
            assigment_table2.save()
            return Response(status=status.HTTP_200_OK)
            
                
            # leave_status_update = LeaveRequest.objects.get(id=leave_id)
            # leave_status_update.status = "In Progress"
            # leave_status_update.save()
            # Send email notification to the assigned HR
            # subject = f"New Ticket Assignment: Ticket ID {assign.assigned_ticket_id}"
            # message = f"""
            # Dear {hr_employee.email},

            # You have been assigned a new ticket.

            # Ticket ID: {assign.assigned_ticket_id}
            
            # Assigned By: {token.name}

            # Please review the ticket at your earliest convenience.

            # Regards,
            # # HR Ticketing System
            # # """
            # send_mail(
            #         subject,
            #         message,
            #         settings.EMAIL_HOST_USER,
            #         ['jebasharon.p@solvedge.in'],#[hr_employee.email],
            #         fail_silently=False,
            #     )

            response_data = {
                "assigned_to": assign.assigned_to.name,
                "assigned_ticket": {
                "employee_name": assign.assigned_ticket.employee.name,
                "leave_type": assign.assigned_ticket.leave_type.leave_name,
                },
                "reason": assign.assigned_ticket.reason,
            }

            return Response(response_data)
       


class HR_List_View(APIView):
    authentication_classes = [Token_Authentication_Process]
    def get(self, request):  
        token = request.user
        print({"data":token.id})
        
        assign_table = Assignment_Table.objects.filter(assigned_to_id = token.id)
        ticket = Assignment_Table.objects.filter(assigned_to_id = token.id).first()
        
        data = []

        for assignment in assign_table:
            attachment = assignment.assigned_ticket.attachment
            data.append({
                'Hr_name': assignment.assigned_to.name,
                'Hr_role': assignment.assigned_to.role,
                "ticket_id":assignment.assigned_ticket_id,
                "Requester_name":assignment.assigned_ticket.employee.name,
                'Leave_type': assignment.assigned_ticket.leave_type.leave_name,
                'Leave_reason': assignment.assigned_ticket.reason,
                'Start_date': assignment.assigned_ticket.start_date,
                'End_date': assignment.assigned_ticket.end_date,
                'status': assignment.assigned_ticket.status,
                'tl_status': assignment.assigned_ticket.tl_status,
                'attachment':attachment if attachment else "No attachment",
                "employee_message":assignment.assigned_ticket.employee_message,
                "hr_message":assignment.assigned_ticket.hr_message or "no message",
                'Applied_at': assignment.assigned_ticket.applied_at,
                'Requester_email': assignment.assigned_ticket.employee.email,
                
           })
        

        return Response({"hr_details":data}, status=status.HTTP_200_OK)
class HR_Dashboard_status_change(APIView):
     throttle_classes = [DemoThrottle]
     authentication_classes = [Token_Authentication_Process] 
     def post(self, request):
        token = request.user
        ticket_id_payload = request.data.get('id')
        hr_reject_payload = request.data.get('hr_reject_payload')
        forward_ticket_tl = request.data.get('forward_ticket_tl')
        forward_ticket_tl_raised = request.data.get('forward_ticket_tl_raised')
        ask_query_payload = request.data.get('ask_query_payload')
        forward_ticket_emp = request.data.get('forward_ticket_emp')
        hr_message_payload = request.data.get('hr_message_payload')
        employee_id = request.data.get("employee_id")
        month = request.data.get("month")  # New parameter for monthly leave data

        # Handle leave count retrieval
        if employee_id and not month:  # Original logic for leave count
            Emergency_leave_filter = LeaveRequest.objects.filter(
                employee_id=employee_id,
                status__in=["re-raised-approved", "approved"],
                leave_type_id=1
            ).count()
            Sick_leave_filter = LeaveRequest.objects.filter(
                employee_id=employee_id,
                status__in=["re-raised-approved", "approved"],
                leave_type_id=2
            ).count()
            Planned_leave_filter = LeaveRequest.objects.filter(
                employee_id=employee_id,
                status__in=["re-raised-approved", "approved"],
                leave_type_id=3
            ).count()
            try:
                orm_fetch = Employee.objects.get(id=employee_id)  # Changed to employee_id
                leave_remaining_format = {
                    "Remaining_Planned_Leave": f"{orm_fetch.gender.Planned_Leave - Planned_leave_filter} / {orm_fetch.gender.Planned_Leave}",
                    "Remaining_Sick_Leave": f"{orm_fetch.gender.Sick_Leave - Sick_leave_filter} / {orm_fetch.gender.Sick_Leave}",
                    "Remaining_Emergency_Leave": f"{orm_fetch.gender.Emergency_Leave - Emergency_leave_filter} / {orm_fetch.gender.Emergency_Leave}" 
                }
            except Employee.DoesNotExist:
                raise AuthenticationFailed("No employee found")
            return Response({"employee_leave_count": leave_remaining_format})

        # Handle monthly leave data retrieval
        if employee_id and month:
            try:
                # Convert month name to month number (e.g., "June" -> 6)
                import calendar
                month_number = list(calendar.month_name).index(month.capitalize())
                # Filter leave requests for the given employee, month, and year (assuming 2025 as current year)
                monthly_leaves = LeaveRequest.objects.filter(
                    employee_id=employee_id,
                    status__in=["re-raised-approved", "approved"],
                    start_date__month=month_number,
                    start_date__year=2025  # Adjust year as needed
                )
                # Count leaves by type
                monthly_planned = monthly_leaves.filter(leave_type_id=3).count()
                monthly_sick = monthly_leaves.filter(leave_type_id=2).count()
                monthly_emergency = monthly_leaves.filter(leave_type_id=1).count()
                monthly_leave_data = {
                    "PlannedLeave": monthly_planned,
                    "SickLeave": monthly_sick,
                    "EmergencyLeave": monthly_emergency
                }
                return Response({"monthly_leave_data": monthly_leave_data})
            except ValueError:
                return Response(
                    {"error": "Invalid month name"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Employee.DoesNotExist:
                raise AuthenticationFailed("No employee found")

        # Existing ticket status change logic
        get_ticket = Assignment_Table.objects.filter(assigned_to=token.id)
        if not get_ticket:
            raise AuthenticationFailed("No Tickets Found")


        ticket = LeaveRequest.objects.get(id=get_tickets.assigned_ticket_id)
        try:
            print({"hellooo":ticket_id_payload})
            get_tickets = Assignment_Table.objects.get(assigned_ticket_id = ticket.id)
        except Assignment_Table.DoesNotExist:
            raise Http404("Assignment Ticket Not Found")

        if forward_ticket_tl:
            try:  # One button - data --> forward to tl
                tl_table = Assigment_table_tl.objects.get(assigned_ticket_id=get_tickets.assigned_ticket_id)
            except Assigment_table_tl.DoesNotExist:
                assign_tl = Assigment_table_tl(
                    assigned_tl_id_id=get_tickets.assigned_ticket.employee.department.id,
                    assigned_ticket_id_id=get_tickets.assigned_ticket_id
                )
                assign_tl.save()
            ticket.status = "in-progress-tl-level"
            ticket.hr_message = hr_message_payload
            ticket.save()
            return Response(status=status.HTTP_200_OK)

        if forward_ticket_tl_raised:
            try:  # One button - data --> forward to tl
                tl_table = Assigment_table_tl.objects.get(assigned_ticket_id=get_tickets.assigned_ticket_id)
            except Assigment_table_tl.DoesNotExist:
                assign_tl = Assigment_table_tl(
                    assigned_tl_id_id=get_tickets.assigned_ticket.employee.department.id,
                    assigned_ticket_id_id=get_tickets.assigned_ticket_id
                )
                assign_tl.save()
            ticket.status = "in-progress-tl-level-re-raised"
            ticket.hr_message = hr_message_payload
            ticket.save()
            return Response(status=status.HTTP_200_OK)

        if hr_reject_payload:
            ticket.status = "hr-rejected"
            ticket.hr_message = hr_message_payload
            ticket.save()
            return Response(status=status.HTTP_200_OK)

        if forward_ticket_emp:
            ticket.status = ticket.tl_status
            ticket.hr_message = hr_message_payload
            ticket.save()
            return Response(status=status.HTTP_200_OK)

        if ask_query_payload:
            ticket.status = "query-raised-by-hr"
            ticket.hr_message = hr_message_payload
            ticket.save()
            return Response(status=status.HTTP_200_OK)
    #  def post(self, request):
    #     token = request.user
    #     ticket_id_payload  = request.data.get('id')
    #     hr_reject_payload = request.data.get('hr_reject_payload')
    #     forward_ticket_tl = request.data.get('forward_ticket_tl')
    #     forward_ticket_tl_raised = request.data.get('forward_ticket_tl_raised')
    #     ask_query_payload = request.data.get('ask_query_payload')
    #     forward_ticket_emp = request.data.get('forward_ticket_emp')
    #     hr_message_payload = request.data.get('hr_message_payload')
    #     employee_id = request.data.get("employee_id")

    #     if employee_id:
    #             Emergency_leave_filter = LeaveRequest.objects.filter(employee_id = employee_id,status__in = ["re-raised-approved","approved"],leave_type_id = 1).count()                        
    #             Sick_leave_filter = LeaveRequest.objects.filter(employee_id = employee_id,status__in = ["re-raised-approved","approved"],leave_type_id = 2).count()
    #             Planned_leave_filter = LeaveRequest.objects.filter(employee_id = employee_id,status__in = ["re-raised-approved","approved"],leave_type_id = 3).count()
    #             try:
    #                     orm_fetch = Employee.objects.get(id = token.id)
    #                     leave_remaining_format = {
    #                             "Remaining_Planned_Leave": f"{orm_fetch.gender.Planned_Leave - Planned_leave_filter} / {orm_fetch.gender.Planned_Leave}",
    #                             "Remaining_Sick_Leave": f"{orm_fetch.gender.Sick_Leave - Sick_leave_filter} / {orm_fetch.gender.Sick_Leave}",
    #                             "Remaining_Emergency_Leave": f"{orm_fetch.gender.Emergency_Leave - Emergency_leave_filter} / {orm_fetch.gender.Emergency_Leave}" 
    #                         }
    #             except Employee.DoesNotExist:
    #                         raise AuthenticationFailed("no employee found")
    #             return Response({"employee_leave_count":leave_remaining_format})


    #     get_ticket = Assignment_Table.objects.filter(assigned_to=token.id)
    #     if not get_ticket:
    #         raise AuthenticationFailed("No Tickets Found")
    #     try:
    #         get_tickets = Assignment_Table.objects.get(assigned_ticket=ticket_id_payload)
    #     except Assignment_Table.DoesNotExist:
    #         raise Http404("Assignment Ticket Not Found")

    #     ticket = LeaveRequest.objects.get(id=get_tickets.assigned_ticket_id)

    #     if forward_ticket_tl:
    #         try: #one button - data -->forward to tl
    #             tl_table = Assigment_table_tl.objects.get(assigned_ticket_id = get_tickets.assigned_ticket_id)
    #         except Assigment_table_tl.DoesNotExist:
    #             assign_tl = Assigment_table_tl(assigned_tl_id_id = get_tickets.assigned_ticket.employee.department.id , assigned_ticket_id_id  = get_tickets.assigned_ticket_id)
    #             assign_tl.save()
    #         ticket.status = "in-progress-tl-level"
    #         ticket.hr_message = hr_message_payload
    #         ticket.save()
    #         return Response(status=status.HTTP_200_OK)   
    #     if forward_ticket_tl_raised:
    #         try: #one button - data -->forward to tl
    #             tl_table = Assigment_table_tl.objects.get(assigned_ticket_id = get_tickets.assigned_ticket_id)
    #         except Assigment_table_tl.DoesNotExist:
    #             assign_tl = Assigment_table_tl(assigned_tl_id_id = get_tickets.assigned_ticket.employee.department.id , assigned_ticket_id_id  = get_tickets.assigned_ticket_id)
    #             assign_tl.save()
    #         ticket.status = "in-progress-tl-level-re-raised"
    #         ticket.hr_message = hr_message_payload
    #         ticket.save()
    #         return Response(status=status.HTTP_200_OK)

    #     if hr_reject_payload:
    #         ticket.status = "hr-rejected"
    #         ticket.hr_message = hr_message_payload
    #         ticket.save()
    #         return Response(status=status.HTTP_200_OK)
    #     if forward_ticket_emp:
    #         ticket.status = ticket.tl_status
    #         ticket.hr_message = hr_message_payload
    #         ticket.save()
    #         return Response(status=status.HTTP_200_OK)
    #     if ask_query_payload:
    #         ticket.status = "query-raised-by-hr"
    #         ticket.hr_message = hr_message_payload
    #         ticket.save()
    #         return Response(status=status.HTTP_200_OK)

      
      
            # Notify the Team Lead
        # employee = change.employee
        # easyuse =change.employee.department.Tl_mail
        # try:
        #     team_lead = Employee.objects.get(email=change.employee.department.Tl_mail)
        # except Employee.DoesNotExist:
        #     return Response("Leave status updated, but Team Lead not found.")

        # subject = f"Leave Request Approved by HR for {employee.name}"
        # message = f"""
        # Dear {easyuse},

        # HR has approved the leave request for employee: {employee.name} ({employee.email}).

        # Leave Type : {change.leave_type.leave_name}
        # Reason     : {change.reason}
        # Start Date : {change.start_date}
        # End Date   : {change.end_date}

        # Please review and take further action.

        # Thank you,
        # HR System
        # """
        # send_mail_to_tl(subject.strip(), message.strip(), team_lead.email)

        # return Response("Status updated and mail sent to TL")

            # return Response("Not Okay")

class TL_Query_view(APIView):
    authentication_classes = [Token_Authentication_Process]
 
    def post(self,request):
        token = request.user
        if not token.role == "Team Lead":
            raise AuthenticationFailed("Credentails Doesnt match TL role")
        
        Query_data = Assigment_table_tl.objects.filter(assigned_tl_id_id = token.department.id)
        print({"queryyy":"yessss"})

        array = []
        status_list = ["in-progress-tl-level","in-progress-tl-level-re-raised","approved","tl-rejected","re-raised-approved","rejection-accepted","re-raised-rejected"]
        for i in Query_data:
               if i.assigned_ticket_id.status in status_list:
                datas = {
                    "TL_Name": i.assigned_ticket_id.employee.department.department_head,
                    "TL_mail": i.assigned_ticket_id.employee.department.Tl_mail,
                    "Ticked_id":i.assigned_ticket_id.id,
                    "Employee_Name": i.assigned_ticket_id.employee.name,
                    "leave_type": i.assigned_ticket_id.leave_type.leave_name,
                    "Reason" : i.assigned_ticket_id.reason,          
                    "Department": i.assigned_ticket_id.employee.department.department_name,
                    "Status" : i.assigned_ticket_id.status,
                    "tl_status":i.assigned_ticket_id.tl_status,
                    "attachment":i.assigned_ticket_id.attachment if i.assigned_ticket_id.attachment else "No attachment",
                    "Employee-ID ":i.assigned_ticket_id.employee_id,
                    "hr_message": i.assigned_ticket_id.hr_message,
                    "tl_message":i.assigned_ticket_id.teamlead_message
                    
                    }
                array.append(datas)

        return Response({"processing_ticket":array},status=status.HTTP_200_OK)

class TL_Status_Approval(APIView):
    
    authentication_classes = [Token_Authentication_Process]
    def post(self,request):

            token =  request.user
            ticket_id_payload = request.data.get("ticketid_payload")
            ticket_approval_payload =  request.data.get('ticket_approval_payload') 
            ticket_reject_payload = request.data.get('ticket_reject_payload')
            reraise_approve_payload =request.data.get('reraise_approve_payload')
            reraise_reject_payload = request.data.get('reraise_reject_payload')
            message_payload = request.data.get('message_payload')

            if not token.role == "Team Lead":
                    raise AuthenticationFailed("Given Credentials doesnt match TL") 
            try:                                            
                progress_data = LeaveRequest.objects.get(id = ticket_id_payload)         
                
            except:
                raise AuthenticationFailed("No records are found")

          
            
            step2 = progress_data.employee.department.Tl_mail == token.email
            if not step2:
                raise AuthenticationFailed("Your not the TL for this Employee")
            if ticket_approval_payload:
                progress_data.tl_status = "approved"
                progress_data.teamlead_message =message_payload
                progress_data.save()
                return Response(status=status.HTTP_200_OK)
            if ticket_reject_payload:
                progress_data.tl_status = "tl-rejected"
                progress_data.teamlead_message =message_payload
                progress_data.save()
                return Response(status=status.HTTP_200_OK)
            if reraise_approve_payload:
                progress_data.tl_status = "re-raised-approved"
                progress_data.teamlead_message = message_payload # give - Approved or Decline
                progress_data.save()
                return Response(status=status.HTTP_200_OK)
            if reraise_reject_payload:
                progress_data.tl_status = "re-raised-rejected"
                progress_data.teamlead_message = message_payload
                progress_data.save()
                return Response(status=status.HTTP_200_OK)
        
            # approval_table = ApprovalHistory()
            # approval_table.employee_id = progress_data.employee_id
            # approval_table.leave_request_id = progress_data.id
            # approval_table.approved_by_id= progress_data.employee.TL.id
            # approval_table.action = progress_data.tl_Approval
            # approval_table.comment = progress_data.reason
            # approval_table.save()
  
            
       
       
        
        # get_data_on_Assign_Table = Assignment_Table.objects.get(assigned_ticket_id=progress_data.id)

        # subject = f"Employee Ticket {progress_data.tl_Approval}: Ticket ID {get_data_on_Assign_Table.assigned_ticket_id}"
        # message = f"""
        # Dear {get_data_on_Assign_Table.assigned_to.email},

        #     The Employee Ticket has been {progress_data.tl_Approval}.

        #     Employee Name : {progress_data.employee.name}

        #     Please review the ticket at your earliest convenience.

        #     Regards,
        #     HR Ticketing System
        #     """
        # send_mail(
        #             subject,
        #             message,
        #             settings.EMAIL_HOST_USER,
        #             ['jebasharon.p@solvedge.in'],#[hr_employee.email],
        #             fail_silently=False,
        #         )

        # serialize = LeaveRequestSerializer(progress_data).data
        # return Response(serialize)

       
class HR_Final_acceptance(APIView):
 
    authentication_classes = [Token_Authentication_Process]

    def post(self,request):
        token = request.user
        Assign_status = request.data['assign_status']
        ticket_id_payload = request.data['ticket_id']
        if token.role != "HR":
            raise AuthenticationFailed("Your credentials didnt matche the HR role")
        
        try:
            filter_ticket = LeaveRequest.objects.get(id= ticket_id_payload )
        except:
            raise AuthenticationFailed("Ticket doesn't found for this ID")
        
        if not filter_ticket.tl_Approval == "Approved":
            raise AuthenticationFailed("TL didn't approved for this ticket")
        
        if filter_ticket.status == "Approved":
            raise AuthenticationFailed("Ticket already Approved")
                        
        filter_ticket.status = Assign_status                 
        filter_ticket.save()
                                                                                                                                                 
        assignment_table = Assignment_Table.objects.get(assigned_ticket_id = filter_ticket.id) 
        try:                                                                                        
            Approval_data = ApprovalHistory.objects.get(leave_request_id = filter_ticket.id)
        except ApprovalHistory.DoesNotExist:
            raise AuthenticationFailed("Ticket Doesn't found in Approval History ")
                                                                           
        Emergency_leave_count = LeaveRequest.objects.filter(status = "Approved",
                                             employee_id = filter_ticket.employee_id,leave_type_id = 1).count()
        Sick_leave_count = LeaveRequest.objects.filter(status = "Approved"
                                                    , employee_id = filter_ticket.employee_id,leave_type_id = 2).count()
        Planned_leave_count = LeaveRequest.objects.filter(status = "Approved",
                                                          employee_id = filter_ticket.employee_id,leave_type_id = 3).count()
        
      
        check = Total_leaves_taken.objects.filter(Employee_id = filter_ticket.employee_id)
        if check.exists():
            check.update(approved_sickleave = Sick_leave_count , approved_plannedleave = Planned_leave_count ,
                                                                                 approved_emergencyleave = Emergency_leave_count ,Employee_id = filter_ticket.employee_id)
        if not check.exists():
            Total_leaves_taken.objects.create(approved_sickleave = Sick_leave_count , approved_plannedleave = Planned_leave_count ,
                                                                    approved_emergencyleave = Emergency_leave_count ,Employee_id = filter_ticket.employee_id)
        leave_record = Total_leaves_taken.objects.get(Employee_id = filter_ticket.employee_id)  
        check2= Total_leave_remaining.objects.filter(Employee_id = filter_ticket.employee_id)
       
        if check2.exists():
            check2.update(remaining_sickleave = filter_ticket.employee.gender.Sick_Leave - leave_record.approved_sickleave , remaining_plannedleave = filter_ticket.employee.gender.Planned_Leave  - leave_record.approved_plannedleave ,
                                                                                 remaining_emergencyleave = filter_ticket.employee.gender.Emergency_Leave - leave_record.approved_emergencyleave ,Employee_id = filter_ticket.employee_id)
        if not check2.exists():
             Total_leave_remaining.objects.create(remaining_sickleave = filter_ticket.employee.gender.Sick_Leave - leave_record.approved_sickleave , remaining_plannedleave = filter_ticket.employee.Gender.Planned_Leave  - leave_record.approved_plannedleave ,
                                                                                 remaining_emergencyleave = filter_ticket.employee.gender.Emergency_Leave - leave_record.approved_plannedleave ,Employee_id = filter_ticket.employee_id)
        Remaining_leave = Total_leave_remaining.objects.get(Employee_id = filter_ticket.employee_id)

        print(Planned_leave_count)
        print(Emergency_leave_count)
        print(Sick_leave_count)
        subject = f"Leave request{filter_ticket.status}: Ticket ID {filter_ticket.id}"
        message = f"""
        Dear Employee Your leave request has been  {filter_ticket.status}: Ticket ID {filter_ticket.id}

            Approved by : {Approval_data.approved_by.department_head} on {Approval_data.date}--Day

            Final Acceptance by : {assignment_table.assigned_to.name}

            Leave Details : From {filter_ticket.start_date} to {filter_ticket.end_date} 

            Your Leave has been {filter_ticket.status}

            Remaining Sick Leave : {Remaining_leave.remaining_sickleave}

            Remaining Emergency Leave : {Remaining_leave.remaining_emergencyleave}

            Remaining Planned Leave : {Remaining_leave.remaining_plannedleave}

            Thank You

            Regards,
            HR Ticketing System
            """
        send_mail(
                    subject,
                    message,
                    settings.EMAIL_HOST_USER,
                    ['jebasharon.p@solvedge.in'],#[hr_employee.email],
                    fail_silently=False,
                )

        serialize =  LeaveRequestSerializer(filter_ticket)
        return Response(serialize.data)