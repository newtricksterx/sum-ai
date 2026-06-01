from rest_framework.throttling import AnonRateThrottle


class AnonMonthRateThrottle(AnonRateThrottle):
    TIMER_PERIODS = {"sec": 1, "min": 60, "hour": 3600, "day": 86400, "month": 2592000}

    def parse_rate(self, rate):
        if rate is None:
            return (None, None)
        num_requests, duration = rate.split("/")
        return (int(num_requests), self.TIMER_PERIODS[duration])
