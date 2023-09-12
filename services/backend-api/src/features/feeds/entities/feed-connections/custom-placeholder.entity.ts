import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({
  _id: false,
  timestamps: false,
  versionKey: false,
})
export class CustomPlaceholderStep {
  @Prop({
    required: true,
  })
  regexSearch: string;

  @Prop({
    required: false,
    type: String,
  })
  replacementString?: string | null;
}

export const CustomPlaceholderStepSchema = SchemaFactory.createForClass(
  CustomPlaceholderStep
);

@Schema({
  _id: false,
  timestamps: false,
  versionKey: false,
})
export class CustomPlaceholder {
  @Prop({
    required: true,
  })
  id: string;

  @Prop({
    required: true,
  })
  sourcePlaceholder: string;

  @Prop({
    required: true,
    type: [CustomPlaceholderStepSchema],
  })
  steps: CustomPlaceholderStep[];
}

export const CustomPlaceholderSchema =
  SchemaFactory.createForClass(CustomPlaceholder);
