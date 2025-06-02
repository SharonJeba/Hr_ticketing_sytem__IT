from django.db import models
from datetime import datetime,date
from django.utils import timezone
class Gender_Table(models.Model):
    choices_list = {
        ('Male','Male'),
        ('Female','Female')
    }
    Genders = models.CharField(max_length=20,choices=choices_list)
    Planned_Leave = models.IntegerField()
    Sick_Leave = models.IntegerField()
    Emergency_Leave = models.IntegerField()

    def __str__(self):
        return f"{self.Genders}"
class Department_table(models.Model):

    department_name = models.CharField(max_length=20)

    department_head = models.CharField(max_length=20)

    Tl_mail = models.CharField(max_length=20, default="teamlead1@gmail.com")

    def __str__(self):
        return f"{self.department_name}---->{self.department_head}"

class Employee(models.Model):
    ROLE_CHOICES = [
        ('Employee', 'Employee'),
        ('HR', 'HR'),
        ('Manager','Manager'),
        ('IT Support', 'IT Support'),
        ('Admin', 'Admin'),
        ('Team Lead','Team Lead')
    ]
    gender_choices = [
        ("Male","Male"),
        ("Female","Female")
    ]

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    gender = models.ForeignKey(Gender_Table,on_delete=models.CASCADE)
    department = models.ForeignKey(Department_table,on_delete=models.CASCADE,null=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)  # Store hashed passwords
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    

    def __str__(self):
        return f"{self.name} -- {self.role}--{self.department.Tl_mail}--{self.department.id}" 

    def is_authenticated(self):
        return True


class LeaveType(models.Model):
    choice_list = {
        ('SickLeave','SickLeave'),
        ('PlannedLeave','PlannedLeave'),
        ('EmergencyLeave','EmergencyLeave')
    }
    leave_name = models.CharField(max_length=50,choices=choice_list)  # Example: Fever, Emergency, Planned

    def __str__(self):
        return f'{self.leave_name}'

# {
#     "message": "Employee details updated",
#     "data": {
#         "id": 1,
#         "name": "John Doe",
#         "email": "john@example.com",
#         "department": "HR"
#     }
# }


class LeaveRequest(models.Model):
    
    id = models.AutoField(primary_key=True)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    leave_type = models.ForeignKey(LeaveType,on_delete=models.CASCADE)
    
    start_date = models.DateField(default=date.today)
    end_date = models.DateField()
    applied_at = models.DateTimeField(auto_now_add=True)
    reason = models.TextField()
    attachment = models.FileField(upload_to='attachments/', null=True, blank=True) 
    

    status = models.CharField(max_length=100,default='pending')
    tl_status = models.CharField(max_length=100,default='pending')

    employee_message = models.CharField(max_length=100,null=True,blank=True)
    hr_message = models.CharField(max_length=100,null=True,blank=True)
    teamlead_message = models.CharField(max_length=100,null=True,blank=True)
    


    def __str__(self):
        return f"{self.employee.name}({self.employee.role}) - {self.leave_type} ({self.status})"

class Assignment_Table(models.Model): 

    assigned_to = models.ForeignKey(Employee,on_delete=models.CASCADE)
    assigned_ticket = models.ForeignKey(LeaveRequest,on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.assigned_to.name} -- ({self.assigned_to.role}) --Ticket--> {self.assigned_ticket}"

class Assigment_table_tl(models.Model):
    assigned_tl_id = models.ForeignKey(Department_table,on_delete=models.CASCADE)
    assigned_ticket_id = models.ForeignKey(LeaveRequest,on_delete=models.CASCADE)


class Total_leaves_taken(models.Model):

    Employee = models.ForeignKey(Employee,on_delete=models.CASCADE)
    approved_sickleave = models.IntegerField()
    approved_plannedleave = models.IntegerField()
    approved_emergencyleave = models.IntegerField()

class Total_leave_remaining(models.Model):

    Employee = models.ForeignKey(Employee,on_delete=models.CASCADE)
    remaining_sickleave = models.IntegerField()
    remaining_plannedleave = models.IntegerField()
    remaining_emergencyleave = models.IntegerField()


class ApprovalHistory(models.Model):
    employee = models.ForeignKey( Employee, on_delete = models.CASCADE)
    leave_request = models.ForeignKey(LeaveRequest, on_delete=models.CASCADE)
    approved_by   = models.ForeignKey(Department_table, on_delete=models.SET_NULL, null=True)
    action        = models.CharField(max_length=20, choices=[('Approved', 'Approved'), ('Rejected', 'Rejected')])
    comment       = models.TextField(blank=True)
    date          = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.leave_request.employee.name} leave was approved by {self.approved_by.department_head}'

class Notification(models.Model):
    
    recipient  = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='notifications')
    message    = models.CharField(max_length=255)
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

# class EmployeeAuditLog(models.Model):
#     employee_id = models.IntegerField(null=True, blank=True)  # Store employee ID instead of ForeignKey
#     employee_email = models.EmailField(null=True, blank=True)  # Optionally store email
#     action = models.CharField(max_length=50)
#     performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
#     changes = models.TextField()
#     timestamp = models.DateTimeField(default=timezone.now)

#     def __str__(self):
#         return f"{self.action} on employee {self.employee_id} at {self.timestamp}