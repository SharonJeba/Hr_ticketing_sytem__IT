from rest_framework import serializers
from .models import (
    Employee, Department_table, Gender_Table, 
    LeaveRequest, LeaveType, Assignment_Table, 
    Total_leaves_taken, Total_leave_remaining, 
    ApprovalHistory, Notification
)

class LeaveRequestSerializer_Emp_ticket_rise(serializers.ModelSerializer):
    class Meta:
        model = LeaveRequest
        fields = ['employee', 'leave_type', 'start_date', 'end_date', 'reason']



class RequestSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField()
    name = serializers.CharField(source='employee.name')
    leave_type = serializers.CharField(source='leave_type.leave_name')
    
    class Meta:
        model = LeaveRequest
        fields = ['id', 'name', 'leave_type', 'status', 'reason', 'start_date', 'end_date', 'applied_at']


class Hr_serializer_table(serializers.ModelSerializer):
    id = serializers.IntegerField()
    employee = serializers.CharField(source='employee.name')
    leave_type = serializers.CharField(source='leave_type.leave_name')
    class Meta:
        model = LeaveRequest
        fields = "__all__"
    


# 🌐 Gender Table
class GenderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gender_Table
        fields = '__all__'


# 🏢 Department Table
class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department_table
        fields = '__all__'

class EmployeeSerializers01(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = "__all__"
    

        

# 👤 Employee Serializer
class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = "__all__"

    def create(self, validated_data):
        # You can hash password here if you're not using Django's built-in User
        return Employee.objects.create(**validated_data)
class GenderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gender_Table
        fields = ['id', 'Genders']

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department_table
        fields = ['id', 'department_name']

# 📄 Leave Type
class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = '__all__'


# 📝 Leave Request
class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    leave_type_name = serializers.CharField(source='leave_type.leave_name', read_only=True)

    class Meta:
        model = LeaveRequest
        fields = '__all__'

class LeaveRequestSerializerFinal(serializers.ModelSerializer):
    class Meta:
        model = LeaveRequest
        fields = ['id', 'employee', 'leave_type', 'reason','attachment','employee_message',
                   'start_date', 'end_date', 'status', 'applied_at','hr_message','teamlead_message']
        read_only_fields = ['id','status', 'applied_at','teamlead_message','hr_message']

class AssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment_Table
        fields = '__all__'


# 📊 Total Leaves Taken
class LeavesTakenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Total_leaves_taken
        fields = '__all__'


# 📉 Total Leaves Remaining
class LeavesRemainingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Total_leave_remaining
        fields = '__all__'


# 🕵️ Approval History
class ApprovalHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalHistory
        fields = '__all__'


# 🔔 Notifications
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class LeaveRequestSerializer_Emp_ticket_rise(serializers.ModelSerializer):
     class Meta:
        model = LeaveRequest
        fields = '__all__'
# class Hr_serializer_table(serializers.ModelSerializer):
#     employee__name = serializers.CharField(source='employee.name', read_only=True)
#     leave_type = serializers.CharField(source='leave_type.leave_name', read_only=True)

#     class Meta:
#         model = LeaveRequest
#         fields = ['id', 'employee.name', 'leave_type', 'status', 'reason', 'start_date', 'end_date', 'applied_at', 'tl_approval']
# class RequestSerializer(serializers.ModelSerializer):
#      class Meta:
#         model = LeaveRequest
#         fields = '__all__'