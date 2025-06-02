from django.contrib import admin
from .models import *


admin.site.register([Gender_Table,Department_table,Employee,LeaveType,LeaveRequest,Assignment_Table,
                     Total_leave_remaining,Total_leaves_taken,ApprovalHistory])