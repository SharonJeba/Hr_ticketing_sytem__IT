from rest_framework.throttling import UserRateThrottle

class DemoThrottle(UserRateThrottle):
    rate = '30/minute' 