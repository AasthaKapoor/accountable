"""Request models, error types and the JSON error shapes (spec section 4)."""

from datetime import UTC, date, datetime
from typing import Annotated, Literal

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, EmailStr, Field

from .rules import STAGES, USER_ACTIVITY_TYPES

# Errors


class ValidationFailed(Exception):
    """A business-rule failure, returned as 422 `{ "errors": { field: message } }`."""

    def __init__(self, errors: dict[str, str]):
        self.errors = errors


class DeleteBlocked(Exception):
    """A blocked delete, returned as 409 `{ "message", "blocking": [...] }` plus any extra fields."""

    def __init__(self, message: str, blocking: list[dict], **extra):
        self.message = message
        self.blocking = blocking
        self.extra = extra


class NotFound(Exception):
    def __init__(self, message: str):
        self.message = message


_MESSAGES = {
    "missing": "Required",
    "string_too_long": "Too long",
    "int_parsing": "Enter a whole number",
    "int_type": "Enter a whole number",
    "int_from_float": "Enter a whole number",
    "date_from_datetime_parsing": "Enter a valid date",
    "date_parsing": "Enter a valid date",
    "date_type": "Enter a valid date",
    "datetime_from_date_parsing": "Enter a valid date and time",
    "datetime_parsing": "Enter a valid date and time",
    "datetime_type": "Enter a valid date and time",
    "literal_error": "Choose one of the options",
    "enum": "Choose one of the options",
    "extra_forbidden": "Not allowed",
}


def _message(error: dict) -> str:
    kind = error["type"]
    if kind == "value_error":
        if "email" in error["msg"]:
            return "Enter a valid email address"
        if "error" in error.get("ctx", {}):
            return str(error["ctx"]["error"])
        return error["msg"].removeprefix("Value error, ")
    if kind in ("greater_than_equal", "less_than_equal"):
        bound = error["ctx"].get("ge", error["ctx"].get("le"))
        return f"Must be {bound} or {'more' if kind == 'greater_than_equal' else 'less'}"
    return _MESSAGES.get(kind, error["msg"])


def _field(loc: tuple) -> str:
    parts = [str(p) for p in loc if p not in ("body", "query", "path")]
    return ".".join(parts) or "body"


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def _request_validation(_request: Request, exc: RequestValidationError):
        errors: dict[str, str] = {}
        for error in exc.errors():
            errors.setdefault(_field(error["loc"]), _message(error))
        return JSONResponse(status_code=422, content={"errors": errors})

    @app.exception_handler(ValidationFailed)
    async def _validation_failed(_request: Request, exc: ValidationFailed):
        return JSONResponse(status_code=422, content={"errors": exc.errors})

    @app.exception_handler(DeleteBlocked)
    async def _delete_blocked(_request: Request, exc: DeleteBlocked):
        return JSONResponse(status_code=409, content={"message": exc.message, "blocking": exc.blocking, **exc.extra})

    @app.exception_handler(NotFound)
    async def _not_found(_request: Request, exc: NotFound):
        return JSONResponse(status_code=404, content={"message": exc.message})


# Field types


def _strip(value):
    return value.strip() if isinstance(value, str) else value


def _required(value):
    if value is None or value == "":
        raise ValueError("Required")
    return value


def _blank_to_none(value):
    value = _strip(value)
    return None if value == "" else value


RequiredText = Annotated[str, BeforeValidator(_strip), AfterValidator(_required)]
Name = Annotated[str, BeforeValidator(_strip), AfterValidator(_required), Field(max_length=200)]
OptionalText = Annotated[str | None, BeforeValidator(_blank_to_none)]
OptionalEmail = Annotated[EmailStr | None, BeforeValidator(_blank_to_none)]
Stage = Literal["new", "qualified", "proposal", "negotiation", "won", "lost"]
Status = Literal["lead", "qualified", "customer"]


def _user_activity_type(value: str) -> str:
    if value == "stage_change":
        raise ValueError("Stage changes are logged automatically")
    if value not in USER_ACTIVITY_TYPES:
        raise ValueError("Choose note, call or email")
    return value


UserActivityType = Annotated[str, AfterValidator(_user_activity_type)]
Pence = Annotated[int, Field(ge=0)]
Percent = Annotated[int, Field(ge=0, le=100)]

assert set(Stage.__args__) == set(STAGES)


class _Body(BaseModel):
    model_config = ConfigDict(extra="forbid")

    def provided(self) -> dict:
        """Only the fields the client sent, for PATCH."""
        values = self.model_dump(include=self.model_fields_set)
        for name in self.required_on_patch():
            if name in values and values[name] is None:
                raise ValidationFailed({name: "Required"})
        return values

    @classmethod
    def required_on_patch(cls) -> tuple[str, ...]:
        return ()


# Organizations


class OrganizationCreate(_Body):
    name: Name
    website: OptionalText = None
    industry: OptionalText = None
    notes: OptionalText = None


class OrganizationUpdate(_Body):
    name: Name | None = None
    website: OptionalText = None
    industry: OptionalText = None
    notes: OptionalText = None

    @classmethod
    def required_on_patch(cls):
        return ("name",)


# Contacts


class ContactCreate(_Body):
    name: RequiredText
    email: OptionalEmail = None
    phone: OptionalText = None
    job_title: OptionalText = None
    organization_id: int
    status: Status = "lead"


class ContactUpdate(_Body):
    name: RequiredText | None = None
    email: OptionalEmail = None
    phone: OptionalText = None
    job_title: OptionalText = None
    organization_id: int | None = None
    status: Status | None = None

    @classmethod
    def required_on_patch(cls):
        return ("name", "organization_id", "status")


# Deals


class DealCreate(_Body):
    name: RequiredText
    organization_id: int
    contact_id: int
    stage: Stage
    value_pence: Pence
    probability: Percent | None = None
    close_date: date


class DealUpdate(_Body):
    name: RequiredText | None = None
    organization_id: int | None = None
    contact_id: int | None = None
    stage: Stage | None = None
    value_pence: Pence | None = None
    probability: Percent | None = None
    close_date: date | None = None

    @classmethod
    def required_on_patch(cls):
        return ("name", "organization_id", "contact_id", "stage", "value_pence", "probability", "close_date")


class DealMove(_Body):
    """`before_id` is the card that ends up directly above the moved card, `after_id` the one directly below."""

    stage: Stage
    before_id: int | None = None
    after_id: int | None = None


# Activities


def to_utc_naive(value: datetime) -> datetime:
    """Store datetimes as naive UTC. A naive input is taken to be UTC already."""
    if value.tzinfo is not None:
        value = value.astimezone(UTC).replace(tzinfo=None)
    return value


class ActivityCreate(_Body):
    type: UserActivityType
    description: RequiredText
    occurred_at: datetime | None = None
    contact_id: int | None = None
    deal_id: int | None = None
    follow_up_date: date | None = None
    follow_up_done: bool = False


class ActivityUpdate(_Body):
    type: UserActivityType | None = None
    description: RequiredText | None = None
    occurred_at: datetime | None = None
    follow_up_date: date | None = None
    follow_up_done: bool | None = None

    @classmethod
    def required_on_patch(cls):
        return ("type", "description", "occurred_at", "follow_up_done")


# Output helpers


def iso_utc(value: datetime) -> str:
    """A stored naive-UTC datetime as ISO 8601 with a Z."""
    return value.replace(tzinfo=UTC).isoformat().replace("+00:00", "Z")
